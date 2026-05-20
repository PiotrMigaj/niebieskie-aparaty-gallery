package models

type Event struct {
	EventID                   string  `json:"eventId"                            dynamodbav:"eventId"`
	CamelGallery              *bool   `json:"camelGallery,omitempty"             dynamodbav:"camelGallery"`
	CreatedAt                 string  `json:"createdAt"                          dynamodbav:"createdAt"`
	Date                      string  `json:"date"                               dynamodbav:"date"`
	Description               *string `json:"description,omitempty"              dynamodbav:"description"`
	GalleryID                 *string `json:"galleryId,omitempty"                dynamodbav:"galleryId"`
	ImagePlaceholderObjectKey *string `json:"imagePlaceholderObjectKey,omitempty" dynamodbav:"imagePlaceholderObjectKey"`
	SelectionAvailable        *bool   `json:"selectionAvailable,omitempty"       dynamodbav:"selectionAvailable"`
	Title                     string  `json:"title"                              dynamodbav:"title"`
	TokenID                   *string `json:"tokenId,omitempty"                  dynamodbav:"tokenId"`
	TokenIDCreatedAt          *string `json:"tokenIdCreatedAt,omitempty"         dynamodbav:"tokenIdCreatedAt"`
	TokenIDValidDays          *string `json:"tokenIdValidDays,omitempty"         dynamodbav:"tokenIdValidDays"`
	Username                  string  `json:"username"                           dynamodbav:"username"`
}
