package models

type GalleryItem struct {
	FileName                   string `json:"fileName"                   dynamodbav:"fileName"`
	EventID                    string `json:"eventId"                    dynamodbav:"eventId"`
	CompressedFileHeight       string `json:"compressedFileHeight"       dynamodbav:"compressedFileHeight"`
	CompressedFileName         string `json:"compressedFileName"         dynamodbav:"compressedFileName"`
	CompressedFileObjectKey    string `json:"compressedFileObjectKey"    dynamodbav:"compressedFileObjectKey"`
	CompressedFilePresignedURL string `json:"compressedFilePresignedUrl" dynamodbav:"compressedFilePresignedUrl"`
	CompressedFileWidth        string `json:"compressedFileWidth"        dynamodbav:"compressedFileWidth"`
	OriginalFileObjectKey      string `json:"originalFileObjectKey"      dynamodbav:"originalFileObjectKey"`
	OriginalFilePresignedURL   string `json:"originalFilePresignedUrl"   dynamodbav:"originalFilePresignedUrl"`
	PresignDateTime            string `json:"presignDateTime"            dynamodbav:"presignDateTime"`
	Username                   string `json:"username"                   dynamodbav:"username"`
}
