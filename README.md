# steps to setup the backend
cd backend

python3 -m venv venv

# in windows
.\venv\Scripts\activate

# in linux
source venv/bin/activate

pip install -r requirements.txt

uvicorn main:app --reload


# steps to setup frontend
cd frontend

bun/npm install

bun dev / npm run dev
