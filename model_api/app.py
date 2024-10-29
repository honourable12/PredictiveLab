import os
from typing import List
from fastapi import FastAPI, HTTPException, Depends, File, Query, UploadFile, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
import joblib
from pydantic import BaseModel
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime, timedelta
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.linear_model import LinearRegression, LogisticRegression
from sklearn.svm import SVC
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import pickle
import json
import numpy as np
from io import BytesIO
import bcrypt
from fastapi.responses import FileResponse

from config import Config
from database import get_db, User, MLModel, Dataset, Prediction
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middelware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],

)

SECRET_KEY = Config.JWT_SECRET_KEY
ALGORITHM = Config.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = Config.JWT_ACCESS_TOKEN_EXPIRE_MINUTES

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=401,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def handle_missing_data(df, strategy='drop', fill_value=None):
    if strategy == 'drop':
        df = df.dropna()
    elif strategy == 'fill':
        df = df.fillna(fill_value)
    return df

def remove_duplicates(df):
    df = df.drop_duplicates()
    return df

def convert_column_type(df, column, new_type):
    try:
        df[column] = df[column].astype(new_type)
    except Exception as e:
        raise ValueError(f"Failed to convert column {column} to {new_type}: {str(e)}")
    return df

def remove_outliers(df, column, method='zscore', threshold=3):
    if method == 'zscore':
        z_scores = np.abs((df[column] - df[column].mean()) / df[column].std())
        df = df[z_scores < threshold]
    elif method == 'iqr':
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        df = df[(df[column] >= Q1 - 1.5 * IQR) & (df[column] <= Q3 + 1.5 * IQR)]
    return df

# def create_default_admin(db: Session):
#     hashed_password = hash_password('adminpassword')
#     new_admin = User(
#             username='admin',
#             password=hashed_password,
#             email='admin@example.com',
#         )
#     db.add(new_admin)
#     db.commit()
#     print("Default admin created.")


# @app.on_event("startup")
# def startup_event():
#     db = next(get_db())
#     create_default_admin(db)
#     db.close()

@app.post("/register")
def register(
    username: str = Form(...), 
    password: str = Form(...), 
    email: str = Form(None), 
    db: Session = Depends(get_db)
):
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    hashed_password = hash_password(password)
    new_user = User(username=username, password=hashed_password, email=email)
    db.add(new_user)
    db.commit()

@app.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(data={"sub": user.username})
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/dataset")
def upload_dataset(
    file: UploadFile = File(...),
    name: str = Form(...),
    description: str = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):

    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Please upload a CSV file")

    try:
        df = pd.read_csv(file.file)
        if df.empty or df.shape[1] == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty or has no columns")
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")
    except pd.errors.ParserError:
        raise HTTPException(status_code=400, detail="Error parsing CSV file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

    file.file.seek(0)

    dataset = Dataset(
        user_id=current_user.id,
        name=name,
        description=description,
        file_data=file.file.read(),
        columns=json.dumps(df.columns.tolist()),
        row_count=len(df)
    )

    db.add(dataset)
    db.commit()
    db.refresh(dataset)

    preview = df.head(10).to_dict(orient="records")

    return {
        "message": "Dataset uploaded successfully",
        "dataset_id": dataset.id,
        "preview": preview
    }

@app.post("/clean_dataset/{dataset_id}")
def clean_dataset(
    dataset_id: int,
    operations: List[dict],
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Retrieve dataset
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    try:
        df = pd.read_csv(BytesIO(dataset.file_data))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

    for operation in operations:
        op_type = operation.get('type')
        
        if op_type == 'handle_missing':
            strategy = operation.get('strategy', 'drop')
            fill_value = operation.get('fill_value', None)
            df = handle_missing_data(df, strategy, fill_value)
        
        elif op_type == 'remove_duplicates':
            df = remove_duplicates(df)
        
        elif op_type == 'convert_type':
            column = operation.get('column')
            new_type = operation.get('new_type')
            if column and new_type:
                df = convert_column_type(df, column, new_type)
            else:
                raise HTTPException(status_code=400, detail="Column or new type missing for conversion")
        
        elif op_type == 'remove_outliers':
            column = operation.get('column')
            method = operation.get('method', 'zscore')
            threshold = operation.get('threshold', 3)
            if column:
                df = remove_outliers(df, column, method, threshold)
            else:
                raise HTTPException(status_code=400, detail="Column missing for outlier removal")

        else:
            raise HTTPException(status_code=400, detail=f"Unknown operation type: {op_type}")

    preview = df.head(10).to_dict(orient="records")
    row_count = df.shape[0]
    column_count = df.shape[1]

    return {
        "message": "Dataset cleaned successfully",
        "preview": preview,
        "row_count": row_count,
        "column_count": column_count
    }


@app.post("/train")
def train(
    dataset_id: int,
    target_column: str,
    model_type: str = "random_forest",
    name: str = "Unnamed Model",
    description: str = None,
    drop_columns: List[str] = Query(None),  # New parameter for columns to drop
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    try:
        df = pd.read_csv(BytesIO(dataset.file_data))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading dataset: {str(e)}")

    if target_column not in df.columns:
        raise HTTPException(status_code=400, detail="Target column not found in dataset")

    if drop_columns:
        for col in drop_columns:
            if col in df.columns and col != target_column:
                df = df.drop(columns=[col])
            else:
                raise HTTPException(status_code=400, detail=f"Column '{col}' cannot be dropped")

    feature_columns = [col for col in df.columns if col != target_column]

    for column in df.select_dtypes(include=['object']).columns:
        if column != target_column:
            le = LabelEncoder()
            df[column] = le.fit_transform(df[column])

    X = df[feature_columns]
    y = df[target_column]

    if model_type == 'linear_regression':
        model = LinearRegression()
    elif model_type == 'logistic_regression':
        model = LogisticRegression(random_state=42)
    elif model_type == 'svm':
        model = SVC(random_state=42)
    elif model_type == 'decision_tree':
        if df[target_column].dtype == 'object':
            model = DecisionTreeClassifier(random_state=42)
        else:
            model = DecisionTreeRegressor(random_state=42)
    elif model_type == 'random_forest':
        if df[target_column].dtype == 'object':
            model = RandomForestClassifier(n_estimators=100, random_state=42)
        else:
            model = RandomForestRegressor(n_estimators=100, random_state=42)
    else:
        raise HTTPException(status_code=400, detail="Invalid model type")

    model.fit(X, y)

    model_binary = pickle.dumps(model)

    config = {
        'feature_columns': feature_columns,
        'target_column': target_column,
        'preprocessing': {
            'label_encoders': {
                col: list(set(df[col]))
                for col in df.select_dtypes(include=['object']).columns
                if col != target_column
            }
        }
    }

    ml_model = MLModel(
        user_id=current_user.id, 
        dataset_id=dataset_id,
        name=name,
        description=description,
        model_type=model_type,
        feature_columns=feature_columns,
        target_column=target_column,
        model_data=model_binary,
        config_data=config
    )

    db.add(ml_model)
    db.commit()
    db.refresh(ml_model)

    return {"message": "Model trained successfully", "model_id": ml_model.id}

@app.post("/predict/{model_id}")
def predict(
    model_id: int,
    data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    ml_model = db.query(MLModel).filter_by(id=model_id, user_id=current_user.id).first()
    if not ml_model:
        raise HTTPException(status_code=404, detail="Model not found")

    try:
        df = pd.DataFrame([data])
        model = pickle.loads(ml_model.model_data)
        config = ml_model.config_data

        missing_columns = set(config['feature_columns']) - set(df.columns)
        if missing_columns:
            raise HTTPException(status_code=400, detail=f"Missing features: {missing_columns}")

        for column, unique_values in config['preprocessing']['label_encoders'].items():
            if column in df.columns:
                df[column] = df[column].map({val: idx for idx, val in enumerate(unique_values)})
                if df[column].isnull().any():
                    raise HTTPException(status_code=400, detail=f"Invalid categorical value in column {column}")

        predictions = model.predict(df[config['feature_columns']]).tolist()

        confidence_score = None
        if hasattr(model, 'predict_proba'):
            confidence_score = model.predict_proba(df[config['feature_columns']])[0].max()

        prediction = Prediction(
            model_id=model_id,
            input_data=data,
            prediction_result=predictions,
            confidence_score=confidence_score
        )
        db.add(prediction)
        db.commit()

        return {"predictions": predictions, "confidence_score": confidence_score}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred during prediction: {str(e)}")

@app.get("/models")
def list_models(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    models = db.query(MLModel).filter_by(user_id=current_user.id).all()
    return [{
        'id': model.id,
        'name': model.name,
        'description': model.description,
        'model_type': model.model_type,
        'feature_columns': model.feature_columns,
        'target_column': model.target_column,
        'created_at': model.created_at.isoformat(),
        'dataset_id': model.dataset_id
    } for model in models]

@app.get("/datasets")
def list_datasets(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    datasets = db.query(Dataset).filter_by(user_id=current_user.id).all()
    return [{
        'id': dataset.id,
        'name': dataset.name,
        'description': dataset.description,
        'columns': json.loads(dataset.columns),
        'row_count': dataset.row_count,
        'created_at': dataset.created_at.isoformat()
    } for dataset in datasets]

@app.get("/predictions/{model_id}")
def get_predictions(
    model_id: int,
    page: int = 1,
    per_page: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    model = db.query(MLModel).filter_by(id=model_id, user_id=current_user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")

    total = db.query(Prediction).filter_by(model_id=model_id).count()
    predictions = db.query(Prediction).filter_by(model_id=model_id) \
        .order_by(Prediction.created_at.desc()) \
        .offset((page - 1) * per_page) \
        .limit(per_page) \
        .all()

    return {
        'predictions': [{
            'id': pred.id,
            'input_data': pred.input_data,
            'prediction_result': pred.prediction_result,
            'confidence_score': pred.confidence_score,
            'created_at': pred.created_at.isoformat()
        } for pred in predictions],
        'total': total,
        'pages': (total + per_page - 1) // per_page,
        'current_page': page
    }

@app.get("/visualize_dataset/{dataset_id}")
def visualize_dataset(
    dataset_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    df = pd.read_csv(BytesIO(dataset.file_data))
    summary = {
        "shape": df.shape,
        "columns": df.columns.tolist(),
        "missing_values": df.isnull().sum().to_dict(),
        "dtypes": df.dtypes.astype(str).to_dict()
    }
    return summary

@app.put("/update_dataset/{dataset_id}")
def update_dataset(
    dataset_id: int,
    name: str = Form(...),
    description: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")
    
    dataset.name = name
    dataset.description = description
    db.commit()
    return {"message": "Dataset updated successfully"}

@app.get("/export_model/{model_id}", response_class=FileResponse)
def export_model(
    model_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(MLModel).filter_by(id=model_id, user_id=current_user.id).first()
    if not model:
        raise HTTPException(status_code=404, detail="Model not found")
    
    model_file_path = model.model_data
    if not os.path.exists(model_file_path):
        raise HTTPException(status_code=404, detail="Model file does not exist")

    return FileResponse(path=model_file_path, filename=os.path.basename(model_file_path), media_type='application/octet-stream')

@app.get("/profile")
def get_profile(current_user: User = Depends(get_current_user)):
    return {
        "username": current_user.username,
        "email": current_user.email,
        "created_at": current_user.created_at
    }

@app.delete("/delete_dataset/{dataset_id}")
def delete_dataset(
    dataset_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    db.delete(dataset)
    db.commit()
    return {"message": "Dataset deleted successfully"}

@app.put("/attach_dataset_to_model/{model_id}")
def attach_dataset_to_model(
    model_id: int, 
    dataset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    model = db.query(MLModel).filter_by(id=model_id, user_id=current_user.id).first()
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not model or not dataset:
        raise HTTPException(status_code=404, detail="Model or Dataset not found")
    
    model.dataset_id = dataset.id
    db.commit()
    return {"message": "Dataset attached to model successfully"}

@app.get("/dataset_stats")
def get_dataset_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    datasets = db.query(Dataset).filter_by(user_id=current_user.id).all()
    stats = {
        "total_datasets": len(datasets),
        "total_rows": sum([dataset.row_count for dataset in datasets])
    }
    return stats

@app.get("/download_dataset/{dataset_id}")
def download_dataset(
    dataset_id: int, 
    db: Session = Depends(get_db), 
    current_user: User = Depends(get_current_user)
):
    dataset = db.query(Dataset).filter_by(id=dataset_id, user_id=current_user.id).first()
    if not dataset:
        raise HTTPException(status_code=404, detail="Dataset not found")

    df = pd.read_csv(BytesIO(dataset.file_data))
    return {
        "csv_data": df.to_csv(index=False)
    }

@app.delete("/delete_account")
def delete_account(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db.delete(current_user)
    db.commit()
    return {"message": "Account deleted successfully"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
