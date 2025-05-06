import multiprocessing
import os
import json
import time
import random
import smtplib
import itertools
import io
import pyodbc
import urllib.parse
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
from azure.storage.blob import BlobServiceClient
import boto3
from botocore.exceptions import ClientError




from fastapi import (
   FastAPI,
   HTTPException,
   Response,
   Depends,
   status,
   Query
)
from fastapi.security import OAuth2PasswordBearer
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import (
   FileResponse,
   RedirectResponse,
   StreamingResponse
)
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import StreamingResponse


from pydantic import BaseModel, EmailStr
from celery import Celery, current_app
from faker import Faker
from email.mime.text import MIMEText
from jose import JWTError, jwt
from dotenv import load_dotenv
from prometheus_client import (
   Counter,
   Histogram,
   generate_latest,
   CONTENT_TYPE_LATEST
)
from multiprocessing import Pool, cpu_count
from billiard import Process
from tenacity import retry, stop_after_attempt, wait_exponential


import pandas as pd
from sqlalchemy import create_engine, exc, text
from celery_app import celery_app
import threading
from typing import Union, List




multiprocessing.set_start_method("spawn", force=True)








# Initialize FastAPI
app = FastAPI()
fake = Faker()


# Enable CORS
app.add_middleware(
   CORSMiddleware,
   allow_origins=["*"],
   allow_credentials=True,
   allow_methods=["*"],
   allow_headers=["*"],
)




CONTAINER_NAME = "generatedfiles"




# Flower monitoring endpoint
@app.get("/monitor")
def monitor_tasks():
   """Redirect to Flower monitoring dashboard"""
   return RedirectResponse(url="http://localhost:5555")


# class AzureSQLManager:
#   def __init__(self):
#       self.engine = self._create_engine()
    
#   def _create_engine(self):
#       """Create SQLAlchemy engine for Azure SQL with connection pooling"""
#       connection_string = (
#           "Driver={ODBC Driver 18 for SQL Server};"
#           "Server=tcp:datasimulation.database.windows.net,1433;"
#           "Database=AzureSQL_data_simulation;"
#           "Uid=admin_hackathan;"
#           "Pwd=#dataSimulation;"
#           "Encrypt=yes;"
#           "TrustServerCertificate=no;"
#           "Connection Timeout=30;"
#       )
#       params = urllib.parse.quote_plus(connection_string)
#       engine = create_engine(
#           f"mssql+pyodbc:///?odbc_connect={params}",
#           pool_size=10,
#           max_overflow=20,
#           pool_timeout=30,
#           pool_pre_ping=True
#       )
#       return engine
# def get_table_names(self) -> List[str]:
#       """Fetch all table names from the database"""
#       try:
#           from sqlalchemy import text
#           with self.engine.connect() as conn:
#               # Query to get all user tables
#               query = text("""
#                   SELECT TABLE_NAME
#                   FROM INFORMATION_SCHEMA.TABLES
#                   WHERE TABLE_TYPE = 'BASE TABLE'
#               """)
#               result = conn.execute(query)
#               tables = [row[0] for row in result.fetchall()]
#               return tables
#       except Exception as e:
#           print(f"Error fetching table names: {str(e)}")
#           raise
# @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
# def save_dataframe(self, df: pd.DataFrame, table_name: str) -> bool:
#       """Save a pandas DataFrame to Azure SQL"""
#       try:
#           clean_table_name = f"synthetic_{table_name.lower().replace(' ', '_')}"
        
#           df.to_sql(
#               name=clean_table_name,
#               con=self.engine,
#               if_exists='append',
#               index=False,
#               chunksize=1000,
#               method='multi'
#           )
#           return True
#       except exc.SQLAlchemyError as e:
#           print(f"Error saving to Azure SQL: {str(e)}")
#           raise

class AzureSQLManager:
    def __init__(self):
        self.engine = self._create_engine()
    
    def _create_engine(self):
        """Create SQLAlchemy engine for Azure SQL with connection pooling"""
        connection_string = (
            "Driver={ODBC Driver 18 for SQL Server};"
            "Server=tcp:datasimulation.database.windows.net,1433;"
            "Database=AzureSQL_data_simulation;"
            "Uid=admin_hackathan;"
            "Pwd=#dataSimulation;"
            "Encrypt=yes;"
            "TrustServerCertificate=no;"
            "Connection Timeout=30;"
        )
        params = urllib.parse.quote_plus(connection_string)
        engine = create_engine(
            f"mssql+pyodbc:///?odbc_connect={params}",
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_pre_ping=True
        )
        return engine

    def get_table_names(self) -> List[str]:
        """Fetch all table names from the database"""
        try:
            from sqlalchemy import text
            with self.engine.connect() as conn:
                # Query to get all user tables
                query = text("""
                    SELECT TABLE_NAME
                    FROM INFORMATION_SCHEMA.TABLES
                    WHERE TABLE_TYPE = 'BASE TABLE'
                """)
                result = conn.execute(query)
                tables = [row[0] for row in result.fetchall()]
                return tables
        except Exception as e:
            print(f"Error fetching table names: {str(e)}")
            raise

    @retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
    def save_dataframe(self, df: pd.DataFrame, table_name: str) -> bool:
        """Save a pandas DataFrame to Azure SQL"""
        try:
            clean_table_name = f"synthetic_{table_name.lower().replace(' ', '_')}"
            
            df.to_sql(
                name=clean_table_name,
                con=self.engine,
                if_exists='append',
                index=False,
                chunksize=1000,
                method='multi'
            )
            return True
        except exc.SQLAlchemyError as e:
            print(f"Error saving to Azure SQL: {str(e)}")
            raise


# Initialize Azure SQL Manager
azure_sql = AzureSQLManager()


# Models
class ColumnSchema(BaseModel):
   name: str
   type: str
   mode: Optional[str] = "NULLABLE"
   constraints: Optional[Dict] = None


class TableSchema(BaseModel):
   table_name: str
   fields: List[ColumnSchema]


class DataGenerationRequest(BaseModel):
   schema: TableSchema
   record_count: int
   output_format: str = "both"
   storage_option: Union[str, List[str]] = "azure_sql"






#Data Generation Functions
def generate_id(prefix: str) -> str:
  return f"{prefix}_{fake.unique.uuid4()}"




def generate_date(start_date: str = '-2y', end_date: str = 'today') -> str:
  return fake.date_between(start_date=start_date, end_date=end_date).isoformat()




def generate_decimal(min_value: float = 1, max_value: float = 1000, decimal_places: int = 2) -> float:
  return round(random.uniform(min_value, max_value), decimal_places)




# Data Generation Functions
def generate_field_value(field: Dict, id_pool: Optional[List] = None) -> any:
   """Generate realistic values using advanced field detection and Faker integration"""
   field_name = field["name"]
   field_type = field["type"]
   field_mode = field.get("mode", "NULLABLE")
   constraints = field.get("constraints", {})
   field_name_lower = field_name.lower()


   # Helper function for pattern handling
   def handle_pattern(pattern: str) -> str:
       clean_pattern = pattern.replace("^", "").replace("$", "")
       return fake.numerify(clean_pattern.replace("\\d", "#"))


   # ID field handling with extended patterns and foreign keys
   if "id" in field_name_lower:
       if constraints.get("pattern"):
           pattern = constraints["pattern"]
           if "CUST" in pattern:
               return fake.bothify(pattern)
           elif "PROD" in pattern:
               return fake.bothify(pattern)
           elif "ORD" in pattern:
               return fake.bothify(pattern)
       if field_type == "INTEGER" and field_name_lower.endswith('_id') and id_pool:
           return random.choice(id_pool) if id_pool else fake.random_int(min=1000, max=9999)


   if field_type == "RECORD":
       if field_mode == "REPEATED":
           return [generate_record({"fields": field["fields"]}, id_pool)
                  for _ in range(random.randint(1, 3))]
       return generate_record({"fields": field["fields"]}, id_pool)


   elif field_type == "STRING":
       # Extended string type handling with 30+ common field patterns
       length = random.randint(constraints.get("min_length", 5), constraints.get("max_length", 50))
      
       if constraints.get("pattern"):
           return handle_pattern(constraints["pattern"])
      
       field_handlers = {
           'email': fake.email,
           'phone': lambda: fake.phone_number(),
           'mobile': lambda: fake.cellphone_number(),
           'country_code': lambda: fake.country_code(representation="alpha-3"),
           'country': fake.country,
           'url': fake.url,
           'username': fake.user_name,
           'credit_card': fake.credit_card_number,
           'zip': fake.postcode,
           'city': fake.city,
           'state': lambda: fake.state_abbr() if "abbr" in field_name_lower else fake.state(),
           'address': fake.street_address,
           'description': lambda: fake.text(max_nb_chars=constraints.get("max_length", 200)),
           'ipv4': fake.ipv4,
           'ipv6': fake.ipv6,
           'first_name': fake.first_name,
           'last_name': fake.last_name,
           'full_name': fake.name,
           'ssn': fake.ssn,
           'company': fake.company,
           'job': fake.job,
           'color': fake.color_name,
           'license_plate': fake.license_plate,
           'iban': fake.iban,
           'currency_code': fake.currency_code,
           'language': lambda: fake.language_code() if "code" in field_name_lower else fake.language_name(),
           'uuid': fake.uuid4,
           'mac_address': fake.mac_address,
           'user_agent': fake.user_agent,
           'file_name': fake.file_name,
           'mime_type': fake.mime_type,
           'password': lambda: fake.password(length=12, special_chars=True),
           'domain': fake.domain_name,
           'twitter': fake.user_name,
           'bitcoin': fake.bban,
       }


       for key in field_handlers:
           if key in field_name_lower:
               return field_handlers[key]()
      
       return fake.pystr(min_chars=constraints.get("min_length", 5), max_chars=constraints.get("max_length", 50))


   elif field_type == "INTEGER":
       # Enhanced integer handling with semantic awareness
       if 'age' in field_name_lower:
           return fake.random_int(min=18, max=90)
       if 'year' in field_name_lower:
           return fake.year()
       return fake.random_int(
           min=constraints.get("min", 1),
           max=constraints.get("max", 100000),
           step=constraints.get("step", 1)
       )


   elif field_type == "DECIMAL":
       # Precision handling with geographic support
       scale = constraints.get("scale", 4 if 'geo' in field_name_lower else 2)
       if 'latitude' in field_name_lower:
           return round(fake.latitude(), scale)
       if 'longitude' in field_name_lower:
           return round(fake.longitude(), scale)
       return round(random.uniform(
           constraints.get("min", 0.0001),
           constraints.get("max", 100000.0)
       ), scale)


   elif field_type == "DATE":
       # Advanced date handling with multiple scenarios
       if 'birth' in field_name_lower:
           return fake.date_of_birth(minimum_age=constraints.get("min_age", 18),
                                   maximum_age=constraints.get("max_age", 90)).isoformat()
       date_handlers = {
           'start': fake.past_date,
           'end': fake.future_date,
           'effective': lambda: fake.date_this_decade(),
           'expir': lambda: fake.date_between(start_date='+1y', end_date='+10y')
       }
       for key in date_handlers:
           if key in field_name_lower:
               return date_handlers[key]().isoformat()
       return fake.date_between(
           start_date=constraints.get("min_date", '-5y'),
           end_date=constraints.get("max_date", 'today')
       ).isoformat()


   elif field_type == "TIMESTAMP":
       return fake.iso8601(tzinfo=None) if constraints.get("iso_format") else fake.unix_time()


   elif field_type == "BOOLEAN":
       # Context-aware boolean generation
       weight = 0.5
       if any(kw in field_name_lower for kw in ['active', 'enabled', 'verified']):
           weight = 0.8
       elif any(kw in field_name_lower for kw in ['deleted', 'expired']):
           weight = 0.2
       return fake.boolean(chance_of_getting_true=weight*100)


   elif field_type == "BYTES":
       return fake.binary(length=random.randint(
           constraints.get("min_length", 10),
           constraints.get("max_length", 1024)
       ))


   elif field_type == "TIME":
       return fake.time(pattern="%H:%M:%S" if constraints.get("with_seconds") else "%H:%M")


   elif field_type == "FLOAT":
       return random.uniform(
           constraints.get("min", 0.0),
           constraints.get("max", 10000.0)
       )


   return None


def generate_record(schema: Dict) -> Dict:
   return {field["name"]: generate_field_value(field) for field in schema["fields"]}


def save_data(data: List[Dict], base_filename: str, output_format: str) -> Dict:
   os.makedirs("generated_data", exist_ok=True)
   result = {}
   if output_format in ["csv", "both"]:
       csv_path = f"generated_data/{base_filename}.csv"
       pd.DataFrame(data).to_csv(csv_path, index=False)
       result["csv"] = csv_path
   if output_format in ["json", "both"]:
       json_path = f"generated_data/{base_filename}.json"
       with open(json_path, 'w') as f:
           json.dump(data, f, indent=2)
       result["json"] = json_path
   return result




def get_blob_service_client():
  """Create and return a BlobServiceClient with proper error handling"""
  try:
      # Validate connection string
      if not AZURE_CONNECTION_STRING or "AccountName=" not in AZURE_CONNECTION_STRING:
          raise ValueError("Invalid Azure Storage connection string configuration")
        
      return BlobServiceClient.from_connection_string(AZURE_CONNECTION_STRING)
  except Exception as e:
      print(f"Failed to create BlobServiceClient: {str(e)}")
      raise




def ensure_container_exists(container_name: str):
  """Ensure the container exists, create if it doesn't"""
  try:
      blob_service_client = get_blob_service_client()
      container_client = blob_service_client.get_container_client(container_name)
    
      if not container_client.exists():
          print(f"Creating container '{container_name}'...")
          container_client.create_container()
          print(f"Container '{container_name}' created successfully")
      return container_client
  except Exception as e:
      print(f"Error ensuring container exists: {str(e)}")
      raise




@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=4, max=10))
def upload_to_blob(file_path: str, blob_name: str):
  """Upload a file to Azure Blob Storage with enhanced error handling"""
  try:
      # Validate file exists
      if not os.path.exists(file_path):
          raise FileNotFoundError(f"Local file {file_path} does not exist")
        
      # Get container client
      container_client = ensure_container_exists(CONTAINER_NAME)
    
      # Create blob client
      blob_client = container_client.get_blob_client(blob_name)
    
      # Upload with progress tracking
      file_size = os.path.getsize(file_path)
      print(f"Uploading {file_path} ({file_size} bytes) to blob {blob_name}")
    
      with open(file_path, "rb") as data:
          blob_client.upload_blob(
              data,
              overwrite=True,
              metadata={
                  "source_file": os.path.basename(file_path),
                  "upload_time": datetime.utcnow().isoformat()
              }
          )
    
      print(f"Successfully uploaded {blob_name}")
      return True
    
  except Exception as e:
      print(f"Error uploading to blob storage: {str(e)}")
      raise


# Multiprocessing Celery Task
def generate_chunk(args):
   chunk_size, schema = args
   return [generate_record(schema) for _ in range(chunk_size)]




@celery_app.task(bind=True, queue='celery', acks_late=True, max_retries=3)
def generate_data_task(self, schema, count, output_format, storage_option="azure_sql"):
   try:
       self.update_state(state='PROGRESS', meta={'current': 0, 'total': count})
      
       # Generate sample record for preview
       sample_record = generate_record(schema)
       preview_csv = "\n".join([",".join(sample_record.keys()), ",".join(map(str, sample_record.values()))])


       # Generate data in chunks
       chunk_size = 1000
       chunks = [chunk_size] * (count // chunk_size)
       if count % chunk_size:
           chunks.append(count % chunk_size)


       data = []
       total_chunks = len(chunks)
       completed_chunks = 0
      
       with ThreadPoolExecutor() as executor:
           futures = []
           for chunk in chunks:
               future = executor.submit(
                   lambda args: [generate_record(args[1]) for _ in range(args[0])],
                   (chunk, schema)
               )
               futures.append(future)
          
           for i, future in enumerate(futures):
               try:
                   chunk_data = future.result()
                   data.extend(chunk_data)
                   completed_chunks += 1
                   current_records = sum(chunks[:completed_chunks])
                   self.update_state(state='PROGRESS', meta={
                       'current': current_records,
                       'total': count,
                       'completed_chunks': completed_chunks,
                       'status': f'Generated {current_records}/{count} records ({completed_chunks}/{total_chunks} chunks)'
                   })
               except Exception as e:
                   self.retry(exc=e, countdown=30)
                   return


       # Save to files
       timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
       base_filename = f"{schema['table_name'].lower()}_{timestamp}"
       files = save_data(data, base_filename, output_format)
      
       # Storage results
       storage_results = {
           "azure_sql": {"status": "not_attempted", "error": None},
           "blob_storage": {"status": "not_attempted", "error": None}
       }


       # Save to Azure SQL if requested
       if storage_option in ["azure_sql", "both"]:
           try:
               df = pd.DataFrame(data)
              
               # Convert date strings to datetime objects
               for field in schema['fields']:
                   if field['type'] in ['DATE', 'TIMESTAMP']:
                       if field['name'] in df.columns:
                           df[field['name']] = pd.to_datetime(df[field['name']])
              
               azure_sql.save_dataframe(df, schema['table_name'])
               storage_results["azure_sql"]["status"] = "success"
           except Exception as e:
               storage_results["azure_sql"]["status"] = "failed"
               storage_results["azure_sql"]["error"] = str(e)
               print(f"Error saving to Azure SQL: {str(e)}")
      
       # In generate_data_task function, enhance the blob storage block with better error logging
       if storage_option in ["blob_storage", "both"] and files:
           try:
               blob_upload_results = {}
               for file_type, file_path in files.items():
                   blob_name = os.path.basename(file_path)
                   try:
                       print(f"Attempting to upload {file_path} to blob storage as {blob_name}")
                       success = upload_to_blob(file_path, blob_name)
                       blob_upload_results[file_type] = {
                           "status": "success" if success else "failed",
                           "blob_name": blob_name
                       }
                       if not success:
                           print(f"Upload_to_blob returned False for {file_type}")
                           raise Exception(f"Failed to upload {file_type} to blob storage")
                   except Exception as upload_error:
                       print(f"Exception during blob upload: {str(upload_error)}")
                       blob_upload_results[file_type] = {
                           "status": "failed",
                           "error": str(upload_error),
                           "blob_name": blob_name
                       }
                       raise
              
               storage_results["blob_storage"] = {
                   "status": "success",
                   "details": blob_upload_results
               }
           except Exception as e:
               print(f"Overall blob storage exception: {str(e)}")
               storage_results["blob_storage"] = {
                   "status": "failed",
                   "error": str(e),
                   "details": blob_upload_results if 'blob_upload_results' in locals() else None
               }


       return {
           "status": "success",
           "records_generated": count,
           "files": files,
           "storage_results": storage_results,
           "previews": {
               "schema_json": json.dumps(schema, indent=2),
               "sample_csv": preview_csv
           },
           "processing_details": {
               "chunk_size": chunk_size,
               "total_chunks": total_chunks
           },
           "storage_results": storage_results
       }


   except Exception as e:
       self.update_state(state='FAILURE', meta={'error': str(e)})
       return {'error': str(e)}








@app.post("/generate-data-async/")
async def generate_data_async(request: DataGenerationRequest):
   """Asynchronous generation endpoint"""
   try:
       task = generate_data_task.delay(
           request.schema.dict(),
           request.record_count,
           request.output_format,
           request.storage_option
       )
       return {"task_id": task.id, "status": "Task started"}
   except Exception as e:
       raise HTTPException(status_code=500, detail=str(e))


@app.get("/task-status/{task_id}")
async def get_task_status(task_id: str):
  """Check task status"""
  try:
      task_result = generate_data_task.AsyncResult(task_id)
    
      # Handle cases where task information can't be retrieved
      if not task_result:
          return {
              "task_id": task_id,
              "status": "NOT_FOUND",
              "error": "Task not found"
          }
    
      # Safely get task state
      try:
          task_state = task_result.state
      except Exception as e:
          return {
              "task_id": task_id,
              "status": "ERROR",
              "error": f"Failed to get task state: {str(e)}"
          }
    
      # Handle failed tasks
      if task_state == 'FAILURE':
          try:
              # Safely get the result/exception
              result = task_result.result
              if isinstance(result, dict) and 'error' in result:
                  error = result['error']
              else:
                  error = str(result) if result else "Unknown error"
            
              return {
                  "task_id": task_id,
                  "status": task_state,
                  "error": error
              }
          except Exception as e:
              return {
                  "task_id": task_id,
                  "status": "FAILURE",
                  "error": f"Failed to get task result: {str(e)}"
              }
    
      # Handle successful tasks
      if task_result.ready():
          try:
              result = task_result.result
              if isinstance(result, dict) and 'error' in result:
                  return {
                      "task_id": task_id,
                      "status": "FAILURE",
                      "error": result['error']
                  }
              return {
                  "task_id": task_id,
                  "status": task_result.status,
                  "result": result
              }
          except Exception as e:
              return {
                  "task_id": task_id,
                  "status": "ERROR",
                  "error": f"Failed to process task result: {str(e)}"
              }
    
      # Handle pending tasks
      progress = {}
      try:
          progress = task_result.info if isinstance(task_result.info, dict) else {}
      except:
          pass
        
      return {
          "task_id": task_id,
          "status": task_state,
          "progress": progress.get('current', 0),
          "total": progress.get('total', 1),
          "message": progress.get('status', 'Processing')
      }




  except Exception as e:
      raise HTTPException(
          status_code=500,
          detail=f"Failed to check task status: {str(e)}"
      )






GENERATED_DATA_DIR = "generated_data"
SCHEMA_DATA_DIR = "schema"


def get_latest_file(extension: str) -> Optional[str]:
   """Fetch the latest file based on the given extension (csv/json)"""
   try:
       files = [f for f in os.listdir(GENERATED_DATA_DIR) if f.endswith(extension)]
       if not files:
           return None
       latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(GENERATED_DATA_DIR, f)))
       return latest_file
   except Exception as e:
       print(f"Error fetching latest file: {e}")
       return None


def get_latest_schema_file(extension: str) -> str:
   """Fetch the latest saved schema JSON file (starting with 'schema_' and ending with '.json')"""
   try:
       files = [f for f in os.listdir(SCHEMA_DATA_DIR) if f.endswith(extension)]
       if not files:
           return None
       latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(SCHEMA_DATA_DIR, f)))
       return latest_file
   except Exception as e:
       print(f"Error fetching latest schema file: {e}")
       return None


@app.get("/live-stream/")
async def stream_latest_file(
   file_type: str = Query(..., description="Type of file to stream (csv, json, schema)"),
   is_schema: bool = Query(False, description="Whether to stream from schema directory")
):
   """Stream the latest CSV, JSON, or Schema file"""
   if file_type not in ["csv", "json", "schema"]:
       raise HTTPException(status_code=400, detail="Invalid file type")


   # Determine directory and file selection based on whether it's a schema file
   if is_schema or file_type == "schema":
       base_dir = SCHEMA_DATA_DIR
       if file_type == "schema":
           file_type = "json"  # Schema files are JSON
   else:
       base_dir = GENERATED_DATA_DIR


   # Get the appropriate file
   if file_type == "csv":
       latest_file = get_latest_file(".csv", base_dir)
       media_type = "text/csv"
   elif file_type == "json":
       latest_file = get_latest_file(".json", base_dir)
       media_type = "application/json"
  
   if not latest_file:
       raise HTTPException(status_code=404, detail=f"No {file_type} file found")


   file_path = os.path.join(base_dir, latest_file)


   def file_generator():
       with open(file_path, "r") as f:
           for line in f:
               yield line


   return StreamingResponse(file_generator(), media_type=media_type)


def get_latest_file(extension: str, directory: str) -> str:
   """Fetch the latest file with given extension in the specified directory"""
   try:
       files = [f for f in os.listdir(directory) if f.endswith(extension)]
       if not files:
           return None
       latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(directory, f)))
       return latest_file
   except Exception as e:
       print(f"Error fetching latest file: {e}")
       return None


@app.get("/download/{filename}")
async def download_file(filename: str):
   """Download generated file"""
   file_path = f"generated_data/{filename}"
   if not os.path.exists(file_path):
       raise HTTPException(status_code=404, detail="File not found")
   return FileResponse(file_path, filename=filename)


@app.get("/")
async def health_check():
   return {"status": "healthy"}




load_dotenv()








from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
from starlette.middleware.base import BaseHTTPMiddleware
import time


# Metrics
REQUEST_COUNT = Counter("http_requests_total", "Total HTTP Requests", ["method", "endpoint"])
REQUEST_LATENCY = Histogram("http_request_duration_seconds", "Request latency", ["endpoint"])


# Middleware for tracking requests
class PrometheusMiddleware(BaseHTTPMiddleware):
   async def dispatch(self, request, call_next):
       start_time = time.time()
       response = await call_next(request)
       duration = time.time() - start_time


       REQUEST_COUNT.labels(request.method, request.url.path).inc()
       REQUEST_LATENCY.labels(request.url.path).observe(duration)
      
       return response


# Add middleware
app.add_middleware(PrometheusMiddleware)


# Prometheus Metrics Endpoint
@app.get("/metrics")
def metrics():
   return Response(generate_latest(), media_type=CONTENT_TYPE_LATEST)






app.mount("/download", StaticFiles(directory="."), name="download")


@app.post("/save-schema/")
async def save_schema(schema_request: dict):
   try:
       # Create schema directory if it doesn't exist
       os.makedirs("schema", exist_ok=True)
       timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
       filename = f"{schema_request.get('table_name', 'schema')}_{timestamp}.json"
       filepath = f"schema/{filename}"
      
       # Save the schema file
       with open(filepath, 'w') as f:
           json.dump(schema_request['schema'], f, indent=2)
          
       return {"status": "success", "filepath": filepath}
   except Exception as e:
       raise HTTPException(status_code=500, detail=str(e))
  


@app.get("/stream-schema/")
async def stream_latest_json():
   """Stream the latest JSON file"""
   latest_json = get_latest_schema_file(".json")
   if not latest_json:
       raise HTTPException(status_code=404, detail="No JSON file found")


   file_path = os.path.join(SCHEMA_DATA_DIR, latest_json)


   def json_generator():
       with open(file_path, "r") as f:
           for line in f:
               yield line


   return StreamingResponse(json_generator(), media_type="application/json")


def get_latest_schema_file(extension: str) -> str:
   """Fetch the latest saved schema JSON file (starting with 'schema_' and ending with '.json')"""
   try:
       files = [f for f in os.listdir(SCHEMA_DATA_DIR) if f.endswith(extension)]
       if not files:
           return None
       latest_file = max(files, key=lambda f: os.path.getmtime(os.path.join(SCHEMA_DATA_DIR, f)))
       return latest_file
   except Exception as e:
       print(f"Error fetching latest schema file: {e}")
       return None
  


@app.get("/get-tables", response_model=List[str])
async def get_tables():
  """Endpoint to fetch all table names from Azure SQL"""
  try:
      tables = azure_sql.get_table_names()
      # Filter to only show tables with 'synthetic_' prefix if needed
      synthetic_tables = [t for t in tables if t.startswith('synthetic_')]
      return synthetic_tables
  except Exception as e:
      raise HTTPException(
          status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
          detail=f"Failed to fetch tables: {str(e)}"
      )








@app.get("/get-table-content/{table_name}")
async def get_table_content(table_name: str, limit: int = 100):
  """Endpoint to fetch content of a specific table"""
  try:
      # Validate table name format
      if not table_name.startswith('synthetic_') or not all(c.isalnum() or c == '_' for c in table_name):
          raise HTTPException(status_code=400, detail="Invalid table name")
        
      with azure_sql.engine.connect() as conn:
          # SQL Server requires TOP value to be literal, not parameterized
          # Using string formatting with validation for safety
          safe_limit = min(max(1, limit), 1000)  # Enforce reasonable bounds
          query = text(f"SELECT TOP {safe_limit} * FROM {table_name}")
        
          # Execute with empty params since we formatted directly
          result = conn.execute(query)
        
          # Convert result to list of dictionaries
          columns = result.keys()
          table_data = [dict(zip(columns, row)) for row in result.fetchall()]
        
          return table_data
  except Exception as e:
      raise HTTPException(
          status_code=500,
          detail=f"Failed to fetch table content: {str(e)}"
      )








@app.get("/get-table-schema/{table_name}")
async def get_table_schema(table_name: str):
  """Endpoint to fetch schema of a specific table"""
  try:
      # Validate table name format
      if not table_name.startswith('synthetic_') or not all(c.isalnum() or c == '_' for c in table_name):
          raise HTTPException(status_code=400, detail="Invalid table name")
        
      with azure_sql.engine.connect() as conn:
          # Query to get column information
          schema_query = text(f"""
              SELECT
                  COLUMN_NAME,
                  DATA_TYPE,
                  CHARACTER_MAXIMUM_LENGTH,
                  IS_NULLABLE,
                  COLUMN_DEFAULT
              FROM INFORMATION_SCHEMA.COLUMNS
              WHERE TABLE_NAME = :table_name
              ORDER BY ORDINAL_POSITION
          """)
        
          result = conn.execute(schema_query, {'table_name': table_name})
          schema_data = result.fetchall()
        
          if not schema_data:
              raise HTTPException(status_code=404, detail="Table not found")
        
          # Convert to a more friendly format
          columns = []
          for row in schema_data:
              columns.append({
                  'name': row.COLUMN_NAME,
                  'type': row.DATA_TYPE,
                  'max_length': row.CHARACTER_MAXIMUM_LENGTH,
                  'nullable': row.IS_NULLABLE == 'YES',
                  'default': row.COLUMN_DEFAULT
              })
        
          return {
              'table_name': table_name,
              'columns': columns
          }
        
  except Exception as e:
      raise HTTPException(
          status_code=500,
          detail=f"Failed to fetch table schema: {str(e)}"
      )










import firebase_admin
from firebase_admin import credentials, auth, initialize_app
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
import os
from firebase_admin import credentials, initialize_app


cred_path = os.getenv("GOOGLE_APPLICATION_CREDENTIALS")
if not cred_path or not os.path.exists(cred_path):
   raise FileNotFoundError(f"Firebase credential file not found: {cred_path}")


cred = credentials.Certificate(cred_path)
firebase_app = initialize_app(cred)






async def verify_token(token: str):
   try:
       decoded_token = auth.verify_id_token(token)
       return decoded_token
   except Exception:
       raise HTTPException(status_code=401, detail="Invalid Firebase token")


@app.get("/protected-route")
async def protected_route(user=Depends(verify_token)):
   return {"message": f"Hello, {user['name']}"}
