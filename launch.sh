npm run build
./clone-students.sh 2 2
./docker-test.sh -d day02 --all
npm run validate-etna -- -d day02 --send
