package workflow

import (
	"fmt"
)

type StepFactory func(def StepDefinition) (Step, error)

var stepRegistry = map[string]StepFactory{}

func RegisterStep(stepType string, factory StepFactory) {
	stepRegistry[stepType] = factory
}

func BuildStep(def StepDefinition) (Step, error) {
	factory, ok := stepRegistry[def.Type]
	if !ok {
		return nil, fmt.Errorf("unknown step type: %s", def.Type)
	}
	return factory(def)
}
