#!/bin/sh

# Create directories
mkdir keys
mkdir requests
mkdir certs

# Generate certificates
openssl req -new -batch -config config/cacert.conf         -out certs/cacert.pem                -keyout keys/cakey.pem -x509 -days 365
openssl req -new -batch -config config/server.conf         -out requests/server-req.pem         -keyout keys/server-key.pem
openssl req -new -batch -config config/webid-student.conf  -out requests/webid-req-student.pem  -keyout keys/webid-key-student.pem
openssl req -new -batch -config config/webid-hbsc.conf     -out requests/webid-req-hbsc.pem     -keyout keys/webid-key-hbsc.pem
openssl req -new -batch -config config/webid-hmsc.conf     -out requests/webid-req-hmsc.pem     -keyout keys/webid-key-hmsc.pem

# Sign certificates
openssl ca -batch -config config/ca.conf -extensions x509_extensions -notext -out certs/server-cert.pem        -infiles requests/server-req.pem
openssl ca -batch -config config/ca.conf -extensions x509_extensions -notext -out certs/webid-cert-student.pem -infiles requests/webid-req-student.pem
openssl ca -batch -config config/ca.conf -extensions x509_extensions -notext -out certs/webid-cert-hbsc.pem    -infiles requests/webid-req-hbsc.pem
openssl ca -batch -config config/ca.conf -extensions x509_extensions -notext -out certs/webid-cert-hmsc.pem    -infiles requests/webid-req-hmsc.pem

# Create certificate for browser...
cp certs/webid-cert-student.pem certs/webid-with-key-student.pem
cat keys/webid-key-student.pem >>certs/webid-with-key-student.pem
openssl pkcs12 -export -in certs/webid-with-key-student.pem -out certs/webid-student.p12 -name "Stu Dent"

cp certs/webid-cert-hbsc.pem certs/webid-with-key-hbsc.pem
cat keys/webid-key-hbsc.pem >>certs/webid-with-key-hbsc.pem
openssl pkcs12 -export -in certs/webid-with-key-hbsc.pem -out certs/webid-hbsc.p12 -name "HBSC"

cp certs/webid-cert-hmsc.pem certs/webid-with-key-hmsc.pem
cat keys/webid-key-hmsc.pem >>certs/webid-with-key-hmsc.pem
openssl pkcs12 -export -in certs/webid-with-key-hmsc.pem -out certs/webid-hmsc.p12 -name "HMSC"
