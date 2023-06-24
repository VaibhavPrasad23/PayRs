#!/bin/bash

echo "ensuring nvm..."
[[ -f ~/.bashrc ]] || touch ~/.bashrc
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.2/install.sh | bash
echo "nvm ensured"

