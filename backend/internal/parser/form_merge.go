package parser

func MergeFormFields(
	base map[string]string,
	overrides map[string]string,
) map[string]string {
	result := make(map[string]string)

	for k, v := range base {
		result[k] = v
	}

	for k, v := range overrides {
		result[k] = v
	}

	return result
}
