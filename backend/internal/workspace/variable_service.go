package workspace

import (
	"context"
	"fmt"
	"strings"

	"github.com/google/uuid"

	"flowra/internal/models"
	"flowra/internal/repository"
	"flowra/internal/security"
	"flowra/internal/workflow"
)

type VariableService struct {
	environments repository.EnvironmentRepository
	variables    repository.VariableRepository
	secretBox    *security.SecretBox
}

type VariableView struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}

func NewVariableService(
	environments repository.EnvironmentRepository,
	variables repository.VariableRepository,
	secretBox *security.SecretBox,
) *VariableService {
	return &VariableService{
		environments: environments,
		variables:    variables,
		secretBox:    secretBox,
	}
}

func (s *VariableService) ResolveEnvironment(
	ctx context.Context,
	tenantID string,
	requested string,
) (*models.Environment, error) {
	environments, err := s.environments.List(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if len(environments) == 0 {
		environment := &models.Environment{
			ID:        uuid.NewString(),
			TenantID:  tenantID,
			Name:      "prod",
			IsDefault: true,
		}
		if err := s.environments.Create(ctx, environment); err != nil {
			return nil, err
		}
		return environment, nil
	}
	if requested != "" {
		for _, environment := range environments {
			if environment.Name == requested || environment.ID == requested {
				return &environment, nil
			}
		}
		environment := &models.Environment{
			ID:       uuid.NewString(),
			TenantID: tenantID,
			Name:     requested,
		}
		if err := s.environments.Create(ctx, environment); err != nil {
			return nil, err
		}
		return environment, nil
	}
	for _, environment := range environments {
		if environment.IsDefault {
			return &environment, nil
		}
	}
	for _, environment := range environments {
		if environment.Name == "prod" {
			return &environment, nil
		}
	}
	return &environments[0], nil
}

func (s *VariableService) List(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentName string,
	reveal bool,
) ([]VariableView, error) {
	environment, err := s.ResolveEnvironment(ctx, tenantID, environmentName)
	if err != nil {
		return nil, err
	}
	rows, err := s.variables.List(ctx, tenantID, collectionID, environment.ID)
	if err != nil {
		return nil, err
	}
	return s.views(rows, reveal)
}

func (s *VariableService) Replace(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentName string,
	values map[string]string,
) error {
	environment, err := s.ResolveEnvironment(ctx, tenantID, environmentName)
	if err != nil {
		return err
	}
	rows := make([]models.Variable, 0, len(values))
	for key, value := range values {
		trimmedKey := strings.TrimSpace(key)
		if trimmedKey == "" {
			continue
		}
		encryptedValue, err := s.secretBox.Encrypt(value)
		if err != nil {
			return err
		}
		rows = append(rows, models.Variable{
			ID:             uuid.NewString(),
			TenantID:       tenantID,
			CollectionID:   collectionID,
			EnvironmentID:  environment.ID,
			Key:            trimmedKey,
			EncryptedValue: encryptedValue,
		})
	}
	return s.variables.ReplaceScope(ctx, tenantID, collectionID, environment.ID, rows)
}

func (s *VariableService) DeleteBulk(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentName string,
	keys []string,
) error {
	environment, err := s.ResolveEnvironment(ctx, tenantID, environmentName)
	if err != nil {
		return err
	}
	return s.variables.DeleteBulk(ctx, tenantID, collectionID, environment.ID, keys)
}

func (s *VariableService) Export(
	ctx context.Context,
	tenantID string,
	collectionID *string,
	environmentName string,
	mode string,
	reveal bool,
) (map[string]interface{}, error) {
	if mode != "all" {
		views, err := s.List(ctx, tenantID, collectionID, environmentName, reveal)
		if err != nil {
			return nil, err
		}
		environment, err := s.ResolveEnvironment(ctx, tenantID, environmentName)
		if err != nil {
			return nil, err
		}
		return map[string]interface{}{
			"environment": environment.Name,
			"variables":   viewsToMap(views),
		}, nil
	}

	environments, err := s.environments.List(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	rows, err := s.variables.ListByEnvironment(ctx, tenantID, collectionID)
	if err != nil {
		return nil, err
	}
	environmentNames := map[string]string{}
	for _, environment := range environments {
		environmentNames[environment.ID] = environment.Name
	}
	result := map[string]interface{}{}
	for _, row := range rows {
		environmentName := environmentNames[row.EnvironmentID]
		if environmentName == "" {
			environmentName = row.EnvironmentID
		}
		if _, ok := result[environmentName]; !ok {
			result[environmentName] = map[string]string{}
		}
		value := maskValue(row.EncryptedValue)
		if reveal {
			decrypted, err := s.secretBox.Decrypt(row.EncryptedValue)
			if err != nil {
				return nil, err
			}
			value = decrypted
		}
		result[environmentName].(map[string]string)[row.Key] = value
	}
	return map[string]interface{}{"environments": result}, nil
}

func (s *VariableService) RuntimeVariables(
	ctx context.Context,
	tenantID string,
	collectionID string,
	environmentName string,
) (map[string]interface{}, error) {
	environment, err := s.ResolveEnvironment(ctx, tenantID, environmentName)
	if err != nil {
		return nil, err
	}
	tenantRows, err := s.variables.List(ctx, tenantID, nil, environment.ID)
	if err != nil {
		return nil, err
	}
	tenantVars, err := s.decryptRows(tenantRows)
	if err != nil {
		return nil, err
	}

	collectionVars := map[string]string{}
	if collectionID != "" {
		collectionRows, err := s.variables.List(ctx, tenantID, &collectionID, environment.ID)
		if err != nil {
			return nil, err
		}
		collectionVars, err = s.decryptRows(collectionRows)
		if err != nil {
			return nil, err
		}
	}

	resolved := map[string]interface{}{}
	for key, value := range tenantVars {
		resolved[key] = value
	}
	tenantState := &workflow.ExecutionState{
		Variables: stringMapToInterface(tenantVars),
	}
	for key, value := range collectionVars {
		resolved[key] = workflow.ResolveTemplate(value, tenantState)
	}
	return resolved, nil
}

func (s *VariableService) views(rows []models.Variable, reveal bool) ([]VariableView, error) {
	views := make([]VariableView, 0, len(rows))
	for _, row := range rows {
		value := maskValue(row.EncryptedValue)
		if reveal {
			decrypted, err := s.secretBox.Decrypt(row.EncryptedValue)
			if err != nil {
				return nil, err
			}
			value = decrypted
		}
		views = append(views, VariableView{Key: row.Key, Value: value})
	}
	return views, nil
}

func (s *VariableService) decryptRows(rows []models.Variable) (map[string]string, error) {
	values := map[string]string{}
	for _, row := range rows {
		value, err := s.secretBox.Decrypt(row.EncryptedValue)
		if err != nil {
			return nil, fmt.Errorf("decrypt variable %s: %w", row.Key, err)
		}
		values[row.Key] = value
	}
	return values, nil
}

func viewsToMap(views []VariableView) map[string]string {
	values := map[string]string{}
	for _, view := range views {
		values[view.Key] = view.Value
	}
	return values
}

func stringMapToInterface(values map[string]string) map[string]interface{} {
	result := map[string]interface{}{}
	for key, value := range values {
		result[key] = value
	}
	return result
}

func maskValue(value string) string {
	if value == "" {
		return ""
	}
	return "••••••••"
}
