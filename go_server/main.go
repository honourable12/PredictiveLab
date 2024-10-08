package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html/template"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"

	//"github.com/joho/godotenv"
)

type ModelInfo struct {
	ModelType           string   `json:"model_type"`
	FeatureColumns      []string `json:"feature_columns"`
	TargetColumn        string   `json:"target_column"`
	CategoricalFeatures []string `json:"categorical_features"`
	TargetClasses       []string `json:"target_classes"`
}

type PreviewResponse struct {
	Preview      []map[string]interface{} `json:"preview"`
	TotalRows    int                      `json:"total_rows"`
	TotalColumns int                      `json:"total_columns"`
	ColumnNames  []string                 `json:"column_names"`
}

var modelInfo ModelInfo

// func init() {
// 	if err := godotenv.Load(".env"); err != nil {
// 		log.Fatal("Error loading .env file", err)
// 	}
// }

func updateModelInfo() error {
	model_api_url := os.Getenv("MODEL_API_URL")
	endpoint := "model-info"
	url := model_api_url + endpoint

	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	return json.NewDecoder(resp.Body).Decode(&modelInfo)
}

func PreviewDataHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		r.ParseMultipartForm(10 << 20)

		file, handler, err := r.FormFile("file")
		if err != nil {
			http.Error(w, fmt.Sprintf("Error retrieving the file: %v", err), http.StatusBadRequest)
			return
		}
		defer file.Close()

		var requestBody bytes.Buffer
		writer := multipart.NewWriter(&requestBody)

		part, err := writer.CreateFormFile("file", handler.Filename)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating form file: %v", err), http.StatusInternalServerError)
			return
		}
		if _, err = io.Copy(part, file); err != nil {
			http.Error(w, fmt.Sprintf("Error copying file data: %v", err), http.StatusInternalServerError)
			return
		}

		numRows := r.FormValue("num_rows")
		if numRows != "" {
			writer.WriteField("num_rows", numRows)
		}

		writer.Close()

		model_api_url := os.Getenv("MODEL_API_URL")
		endpoint := "preview"
		url := model_api_url + endpoint

		req, err := http.NewRequest("POST", url, &requestBody)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating request: %v", err), http.StatusInternalServerError)
			return
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error sending request to ML API: %v", err), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		var previewResponse PreviewResponse
		if err := json.NewDecoder(resp.Body).Decode(&previewResponse); err != nil {
			http.Error(w, fmt.Sprintf("Error parsing preview response: %v", err), http.StatusInternalServerError)
			return
		}

		tmpl := template.Must(template.ParseFiles("preview.html"))
		tmpl.Execute(w, previewResponse)
	} else {
		tmpl := template.Must(template.ParseFiles("preview.html"))
		tmpl.Execute(w, nil)
	}
}

func TrainModelHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		r.ParseMultipartForm(10 << 20)

		file, handler, err := r.FormFile("file")
		if err != nil {
			http.Error(w, fmt.Sprintf("Error retrieving the file: %v", err), http.StatusBadRequest)
			return
		}
		defer file.Close()

		var requestBody bytes.Buffer
		writer := multipart.NewWriter(&requestBody)

		part, err := writer.CreateFormFile("file", handler.Filename)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating form file: %v", err), http.StatusInternalServerError)
			return
		}
		if _, err = io.Copy(part, file); err != nil {
			http.Error(w, fmt.Sprintf("Error copying file data: %v", err), http.StatusInternalServerError)
			return
		}

		targetColumn := r.FormValue("target_column")
		if targetColumn == "" {
			http.Error(w, "Target column not specified", http.StatusBadRequest)
			return
		}
		writer.WriteField("target_column", targetColumn)

		modelType := r.FormValue("model_type")
		if modelType == "" {
			http.Error(w, "Model type not specified", http.StatusBadRequest)
			return
		}
		writer.WriteField("model_type", modelType)

		dropColumns := r.FormValue("drop_columns")
		if dropColumns != "" {
			writer.WriteField("drop_columns", dropColumns)
		}

		writer.Close()

		model_api_url := os.Getenv("MODEL_API_URL")
		endpoint := "train"
		url := model_api_url + endpoint

		req, err := http.NewRequest("POST", url, &requestBody)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating request: %v", err), http.StatusInternalServerError)
			return
		}
		req.Header.Set("Content-Type", writer.FormDataContentType())

		client := &http.Client{}
		resp, err := client.Do(req)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error sending request to ML API: %v", err), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		if err := updateModelInfo(); err != nil {
			log.Printf("Warning: Failed to update model info: %v", err)
		}

		w.Header().Set("Content-Type", "application/json")
		io.Copy(w, resp.Body)
	} else {
		tmpl := template.Must(template.ParseFiles("train.html"))
		tmpl.Execute(w, nil)
	}
}

func PredictModelHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method == "POST" {
		if err := r.ParseForm(); err != nil {
			http.Error(w, fmt.Sprintf("Error parsing form: %v", err), http.StatusBadRequest)
			return
		}

		features := make(map[string]interface{})
		for _, feature := range modelInfo.FeatureColumns {
			value := r.FormValue(feature)
			if value == "" {
				http.Error(w, fmt.Sprintf("Missing feature: %s", feature), http.StatusBadRequest)
				return
			}
			features[feature] = value
		}

		jsonData, err := json.Marshal(features)
		if err != nil {
			http.Error(w, fmt.Sprintf("Error creating JSON: %v", err), http.StatusInternalServerError)
			return
		}

		model_api_url := os.Getenv("MODEL_API_URL")
		endpoint := "predict"
		url := model_api_url + endpoint

		resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
		if err != nil {
			http.Error(w, fmt.Sprintf("Error sending request to ML API: %v", err), http.StatusInternalServerError)
			return
		}
		defer resp.Body.Close()

		var predictionResponse struct {
			Predictions []string `json:"predictions"`
			Error       string   `json:"error"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&predictionResponse); err != nil {
			http.Error(w, fmt.Sprintf("Error parsing prediction response: %v", err), http.StatusInternalServerError)
			return
		}

		tmpl := template.Must(template.ParseFiles("predict.html"))
		tmpl.Execute(w, struct {
			ModelInfo   ModelInfo
			Predictions []string
			Error       string
		}{
			ModelInfo:   modelInfo,
			Predictions: predictionResponse.Predictions,
			Error:       predictionResponse.Error,
		})
	} else {
		tmpl := template.Must(template.ParseFiles("predict.html"))
		tmpl.Execute(w, struct {
			ModelInfo ModelInfo
		}{
			ModelInfo: modelInfo,
		})
	}
}

func main() {
	if err := updateModelInfo(); err != nil {
		log.Printf("Warning: Could not fetch initial model info: %v", err)
	}

	http.HandleFunc("/preview", PreviewDataHandler)
	http.HandleFunc("/train", TrainModelHandler)
	http.HandleFunc("/predict", PredictModelHandler)
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		tmpl := template.Must(template.ParseFiles("index.html"))
		tmpl.Execute(w, modelInfo)
	})

	http.ListenAndServe(":10000", nil)
}
