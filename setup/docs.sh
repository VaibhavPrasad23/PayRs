SETUP=$(cat tmp/setup.txt) 

if [ "$SETUP" ]; then
  echo "\033[32mPlease maintain your internet connection, and retry if error occurres during the setup proccess.\033[0m";
  sleep 1
  npm test -- --testTimeout=130000
  npm run apidoc
fi
echo "n" > tmp/setup.txt;
exit 0;
