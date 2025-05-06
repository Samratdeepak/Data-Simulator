# steps to setup the backend
cd backend

python3 -m venv venv

# in windows
.\venv\Scripts\activate

# in linux
source venv/bin/activate



# then run these commands

pip install -r requirements.txt

celery -A main.celery_app worker --loglevel=info --pool=threads --concurrency=4 -Q celery -n worker1@%h


celery -A main.celery_app --broker=redis://localhost:6379/0 flower --port=5555

redis-server

uvicorn main:app --reload


# steps to setup frontend
cd frontend

bun/npm install

bun dev / npm run dev
