# Financial Transaction Tracking

## Objective

Every time the user makes a financial transaction, an email will be sent to the user containing the following:

-How much was spent 

-The sum of transactions per current pay period (restarts every two weeks) 

-Difference between sum of spent vs allowed spending limit

-Graphs illustrating the past weeks transactions

Below is an example email the user receives after a transaction occurs: 

![alt text](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/stor_/EndEmail.png?raw=true)

## Summary

With the evolution of 'contactless payment' becoming widely available to the population, the physical action of spending money has become much less taxing to complete. This automation in the spending process has caused a higher volume of transactions compared to times before 'contactless payment' widespread adoption. The reduction of friction in the spending process should be accompanied with automated tracking of transaction interactions and easy to digest spending reports for the consumer. 

This project addresses the automation misalignment seen between the payment process and the process used to track those payments. A higher volume of payments calls for a higher volume of 'tracking reports' to be seen by the consumer to stave off overspending.

## Process 

The tracking/reporting of financial transactions is achieved via serverless architecture (across multiple cloud platforms) that execute time/event driven functions. 

### ETL Flow Path (steps explained below)

![alt text](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/stor_/ETL_flow.png?raw=true)

Once Wells Fargo detects an electronic payment has been made an email is sent to a Gmail account.

### step 1
GoogleApps script has a time driven trigger that runs once every 60 seconds (use [function setFincTrigger()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js) to activate). If an email is detected that appears to have come from the bank stating a transaction has occured the following occurs: GmailApps script parses the email (via [function s2_queryEmailsSend2AWS()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?)) to find cost of transaction, the date/time of the transaction, where the transaction took place, and runs a separate search to find last paycheck deposit (via [function s1_lastDepDate()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)). This information is then stored in variables (in json format) that is sent to an AWS API. (note: If the API successfully receives the information the script deletes the current email).

### step 2
After the API receives the JSON file, it triggers the first lambda function ([TransactionProcessor.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor.py)) to run. This lambda function takes the JSON file, formats it, and then sends the file to a 'raw' AWS S3 bucket.

### step 3
After receiving confirmation that the file has been uploaded to the S3 bucket, GmailApps script request (via [function s3_runAthenaQuery()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)) to execute a Lambda function ([TransactionProcessor_step2.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step2.py)) that runs an Athena SQL query on the 'raw' S3 bucket. This query will sum the value of money spent in the current pay period and then calculate the difference of allowance left. The results of the query are stored in a separate 'clean' S3 Bucket. The API returns the query ID number to the JavaScript.

### step 4
The JavaScript pauses to allow the query to finish properly before making another API request (via [function s4_getAthenaResults2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)). This API request triggers a Lambda function ([TransactionProcessor_step3.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step3.py)) to retrieve the query results from the 'clean' S3 bucket. The lambda function uses the last deposit date, the sum of transaction cost, and other data to relay information (in the form of a string) back to gmail via the API response. 

### step 5
The gmailapps JavaScript [function s5_grabBoxPlot()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js) stores the string data in a variable and makes a call to an API that runs [lambda_function.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step4/lambda_function.py)(AKA TransactionProcessor_step4). The lambda function has multiple python libraries stored in it that allows it to make graphs from the data that’s fed to it. Once the graphs are made it becomes a little tricky to return graph data through an API response. The graphs must be converted to byte data before they can be sent in an API response. The JavaScript needs to convert the byte data back into a png file.

Only one graph can be sent per API response, our system includes two graphs. [lambda_function.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step4/lambda_function.py)(AKA TransactionProcessor_step4) contains the code to return both of the graphs shown in the example email. The lambda function utilizes input data and 'if' statements to control which plots are returned to the JavaScript. 

### step 6
Once the data is received by the JavaScript an email is sent to the user (via [function s7_sendEmail()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)).