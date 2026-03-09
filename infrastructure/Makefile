ENV ?= production
TF_DIR := environments/$(ENV)

.PHONY: init plan apply destroy fmt validate

init:
	cd $(TF_DIR) && terraform init

plan:
	cd $(TF_DIR) && terraform plan

apply:
	cd $(TF_DIR) && terraform apply

destroy:
	cd $(TF_DIR) && terraform destroy

fmt:
	terraform fmt -recursive

validate:
	@for env in production shared; do \
		echo "=== Validating $$env ==="; \
		cd environments/$$env && terraform init -backend=false && terraform validate && cd ../..; \
	done

state:
	cd $(TF_DIR) && terraform state list

output:
	cd $(TF_DIR) && terraform output

production:
	$(MAKE) plan ENV=production

shared:
	$(MAKE) plan ENV=shared
