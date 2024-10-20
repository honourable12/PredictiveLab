from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, ForeignKey, Float, LargeBinary
import sqlalchemy
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import JSON
from datetime import datetime
from config import Config

SQLALCHEMY_DATABASE_URL = Config.SQLALCHEMY_DATABASE_URI

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = sqlalchemy.orm.declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(80), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    email = Column(String(120), unique=True, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    is_active = Column(Boolean, default=True)

    models = relationship('MLModel', back_populates='user', cascade='all, delete-orphan')
    datasets = relationship('Dataset', back_populates='user', cascade='all, delete-orphan')

class MLModel(Base):
    __tablename__ = 'ml_models'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String)
    model_type = Column(String(50), nullable=False)
    feature_columns = Column(JSON, nullable=False)
    target_column = Column(String(50), nullable=False)
    model_data = Column(LargeBinary, nullable=False)
    config_data = Column(JSON, nullable=False)
    metrics = Column(JSON)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    is_active = Column(Boolean, default=True)

    dataset_id = Column(Integer, ForeignKey('datasets.id'))
    user = relationship('User', back_populates='models')
    dataset = relationship('Dataset', back_populates='models')
    predictions = relationship('Prediction', back_populates='model', cascade='all, delete-orphan')

class Dataset(Base):
    __tablename__ = 'datasets'

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(String)
    file_data = Column(LargeBinary)
    columns = Column(JSON, nullable=False)
    row_count = Column(Integer)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship('User', back_populates='datasets')
    models = relationship('MLModel', back_populates='dataset')

class Prediction(Base):
    __tablename__ = 'predictions'

    id = Column(Integer, primary_key=True, index=True)
    model_id = Column(Integer, ForeignKey('ml_models.id', ondelete='CASCADE'), nullable=False)
    input_data = Column(JSON, nullable=False)
    prediction_result = Column(JSON, nullable=False)
    confidence_score = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)

    model = relationship('MLModel', back_populates='predictions')

# Database Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables in the database
def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("Database initialized successfully!")