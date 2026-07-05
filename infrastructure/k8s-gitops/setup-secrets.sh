#!/bin/bash

echo "Setting up Engine Secrets..."
sudo k3s kubectl create secret docker-registry acr-secret --namespace smartmove-engine --docker-server=smartmoveacr.azurecr.io --docker-username=smartmoveacr --docker-password=5UlyBloDm4wMsW8KfmLP9lfBrT2XOq9cu5rhLzBrB836xrRJQQJ99CCACF24PCEqg7NAAACAZCRNwZg
sudo k3s kubectl patch serviceaccount default -p '{"imagePullSecrets":[{"name":"acr-secret"}]}' --namespace smartmove-engine

echo "Setting up Admin Secrets..."
sudo k3s kubectl create secret docker-registry acr-secret --namespace smartmove-admin --docker-server=smartmoveacr.azurecr.io --docker-username=smartmoveacr --docker-password=5UlyBloDm4wMsW8KfmLP9lfBrT2XOq9cu5rhLzBrB836xrRJQQJ99CCACF24PCEqg7NAAACAZCRNwZg

echo "Done!"