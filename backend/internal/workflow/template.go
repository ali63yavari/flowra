package workflow

import (
	"fmt"
	"regexp"
	"strings"
)

var templateRegex = regexp.MustCompile(`\{\{(.*?)\}\}`)

func ResolveTemplate(input string, state *ExecutionState) string {
	return templateRegex.ReplaceAllStringFunc(
		input, func(match string) string {
			key := strings.Trim(match, "{} ")

			val := resolveKey(key, state)
			return fmt.Sprintf("%v", val)
		},
	)
}

func resolveKey(key string, state *ExecutionState) interface{} {
	parts := strings.Split(key, ".")

	if len(parts) < 2 {
		return ""
	}

	switch parts[0] {
	case "input":
		return state.Input[parts[1]]
	case "extract":
		return state.Extracted[parts[1]]
	case "var":
		return state.Variables[parts[1]]
	default:
		return ""
	}
}
