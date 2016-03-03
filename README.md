Introduction
============

This is a proof-of-concept implementation (PoC) for a use case devised in the PerSemID-project
at BFH, <http://persemid.bfh.ch>. It demonstrates a hypothetical workflow for exchanging information
related to the enrollment for master studies at a university. 

This application consists of three distinct views: one for the student, one for the university at
which he's got his bachelor's degree and one for the university at which he tries to enroll for
master studies. In real life, of course, these would be completly separated applications running
at the respective parties, here they are only united for the ease of use of the PoC.

The main technologies demonstrated in this PoC are the exchange of data relevant to the process
for enrollment in master studies using [RDF](http://www.w3.org/RDF) as well as authentication and
authorisation between the related parties using [WebID](http://webid.info).

Installation
============

Prerequisites:
--------------

* A checkout of the project (this directory)
* JAVA 8 JRE
* [Apache Jena Fuseki 2.3.x](https://jena.apache.org/download/index.cgi)
* [NodeJS 4.2.x](https://nodejs.org/dist/v4.2.4/)

Additionaly, for the installation of the required JavaScript-modules with npm (see below), the 
following utilities including their dependencies will be needed:

* python (2.7 should be sufficient, 3.x should work)
* make
* g++

Refer to the respective manuals and best practises for your operating system for the installation
of the above dependencies. 

Ensure that the executables "node" and "npm" are in your path and can be started without any issues.

In case of troubles starting Fuseki, ensure that the two environment variables FUSEKI_HOME and 
FUSEKI_BASE point to the right directory.

Fuseki Configuration
--------------------
1. Start the Fuseki-server and access it by pointing your browser to <http://localhost:3030> 
   (replace localhost if needed by the host on which you have installed Fuseki and the other
   components). Note: if you are accessing Fuseki over the network, you may have to set 
   the permissions in it's "shiro.ini" to be able to perform the following operations.

2. In the Fuseki webinterface, go to the "manage datasets"-tab and click "add new dataset".

3. Enter "persemid" as name for the new dataset, choose the other options according to your needs.

4. Change to the "dataset"-tab and choose the "edit"-tab in the new view

5. Enter "http://student.example.org" in the "graph:"-field and paste the contents of the file
   default-data/student.ttl into the textarea below, click "save". 

6. Enter "http://hbsc.example.org" in the "graph:"-field and paste the contents of the file
   default-data/hbsc.ttl into the textarea below, click "save". 

7. Enter "http://hmsc.example.org" in the "graph:"-field and paste the contents of the file
   default-data/hmsc.ttl into the textarea below, click "save".

8. Click on the "list current graphs" button to the left of the textarea and ensure that you
   see the three freshly created graphs and some amount of triples in them, otherwise repeat
   the according steps above.

You have now successfully prepared Fuseki for the PerSemID-PoC.

Install and start the PerSemID-PoC
----------------------------------

1. Create the directories used to store user files:
```
   /tmp/psidimas/student
   /tmp/psidimas/hbsc
   /tmp/psidimas/hmsc
```

2. Change into the directory containing the project-checkout

3. Run the command "npm install" - this may take a while

4. If no errors occured turing the install, the PerSemID-PoC can now be started using the
   command "npm start" at any time

Congratulations! You should now have successfully installed the PerSemID-PoC and 
can try it out by accessing it at <http://localhost:8443> (or the host you're using for
the installation)!
