package security

import (
	"strings"

	"github.com/PuerkitoBio/goquery"
)

func ExtractCSRF(html string, selector string) (string, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return "", err
	}

	val, exists := doc.Find(selector).Attr("value")
	if !exists {
		return "", nil
	}

	return val, nil
}
