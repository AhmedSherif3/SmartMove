#!/bin/bash

echo "Cleaning up old secrets..."
sudo k3s kubectl delete secret acr-secret -n smartmove-prod --ignore-not-found

echo "Creating new Azure secret for production..."
sudo k3s kubectl create secret docker-registry acr-secret --namespace smartmove-prod --docker-server=smartmoveacr.azurecr.io --docker-username=smartmoveacr --docker-password=5UlyBloDm4wMsW8KfmLP9lfBrT2XOq9cu5Bi2i5rhLzBrB836xrRJQQJ99CCACF24PCEqg7NAAACAZCRNwZg

echo "Restarting all production pods..."
sudo k3s kubectl delete pods --all -n smartmove-prod

echo "Done!"
