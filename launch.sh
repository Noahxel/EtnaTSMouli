npm run build
./clone-students.sh 1 1
./docker-test.sh -d day01 --all
npm run validate-etna -- --send 
