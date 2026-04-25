package parser

import (
	"strings"

	"github.com/PuerkitoBio/goquery"
)

type Form struct {
	Action string
	Method string
	Fields map[string]string
}

func ParseForm(html string, formSelector string) (*Form, error) {
	doc, err := goquery.NewDocumentFromReader(strings.NewReader(html))
	if err != nil {
		return nil, err
	}

	formSel := doc.Find(formSelector)
	if formSel.Length() == 0 {
		return nil, nil
	}

	action, _ := formSel.Attr("action")
	method, exists := formSel.Attr("method")
	if !exists {
		method = "GET"
	}

	fields := make(map[string]string)

	// input fields
	formSel.Find("input").Each(
		func(i int, s *goquery.Selection) {
			name, exists := s.Attr("name")
			if !exists {
				return
			}

			value, _ := s.Attr("value")
			fields[name] = value
		},
	)

	// textarea
	formSel.Find("textarea").Each(
		func(i int, s *goquery.Selection) {
			name, exists := s.Attr("name")
			if !exists {
				return
			}

			fields[name] = s.Text()
		},
	)

	// select (take first option)
	formSel.Find("select").Each(
		func(i int, s *goquery.Selection) {
			name, exists := s.Attr("name")
			if !exists {
				return
			}

			val := ""
			s.Find("option").Each(
				func(i int, opt *goquery.Selection) {
					if selected, _ := opt.Attr("selected"); selected != "" {
						val = opt.AttrOr("value", "")
					}
				},
			)

			if val == "" {
				val = s.Find("option").First().AttrOr("value", "")
			}

			fields[name] = val
		},
	)

	return &Form{
		Action: action,
		Method: strings.ToUpper(method),
		Fields: fields,
	}, nil
}
