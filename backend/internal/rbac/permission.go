package rbac

import "flowra/internal/models"

type Action string

const (
	ActionExecuteIntegration Action = "execute_integration"
	ActionViewJob            Action = "view_job"
	ActionManageIntegration  Action = "manage_integration"
	ActionManageTenant       Action = "manage_tenant"
)

var rolePermissions = map[models.Role][]Action{
	models.RoleOwner: {
		ActionExecuteIntegration,
		ActionViewJob,
		ActionManageIntegration,
		ActionManageTenant,
	},
	models.RoleAdmin: {
		ActionExecuteIntegration,
		ActionViewJob,
		ActionManageIntegration,
	},
	models.RoleMember: {
		ActionExecuteIntegration,
		ActionViewJob,
	},
	models.RoleViewer: {
		ActionViewJob,
	},
}

func HasPermission(role models.Role, action Action) bool {
	actions := rolePermissions[role]

	for _, a := range actions {
		if a == action {
			return true
		}
	}
	return false
}
