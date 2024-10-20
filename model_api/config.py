import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv('DATABASE_URL')

    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
    ALGORITHM = os.getenv('ALGORITHM')

    DEBUG = os.getenv('FAST_ENV') == 'development'