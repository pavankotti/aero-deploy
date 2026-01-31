#!/bin/bash
export GIT_REPO_URL="$GIT_REPO_URL"

echo "Cloning repository: $GIT_REPO_URL"

git clone "$GIT_REPO_URL" /home/app/output

exec node script.js