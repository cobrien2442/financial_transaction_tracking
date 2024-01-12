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

With the evolution of 'contactless payment' becoming widely available to the population, the physical action of spending money has become much less taxing to complete. This automation in the spending process has caused a higher volume of transactions to occur compared to times before 'contactless payment' widespread adoption. The reduction of friction in the spending process should be accompanied with automated tracking of transaction interactions and easy to digest spending reports for the consumer. 

This project addresses the automation misalignment seen between the payment process and the process used to track those payments. A higher volume of payments calls for a higher volume of 'tracking reports' to be seen by the consumer to stave off overspending.

## Process 

The tracking/reporting of financial transactions is achieved via serverless architecture (across multiple cloud platforms) that execute time/event driven functions. 

### ETL Flow Path

A prerequisite of this project requires the user to get their bank to send an email to them when a financial transaction occurs. This can usually be achieved by changing the settings on the account via the bank website or app.

Once the above prerequisite is met and code is implemented in the proper cloud platforms: data received from the bank will flow through the below path

![alt text](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/stor_/ETL_flow.png?raw=true)


### step 1 (Google Apps Script)

A time driven trigger (set to run every 60 seconds) searches the user’s inbox for ‘financial transaction’ emails from the bank. The key words the script is looking for can be found here: [function s1_lastDepDate()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js). Once an email is detected, the script utilizes regular expression searches to find cost of transaction, the date/time of the transaction, and where the transaction took place. The regular expressions can be found here: [function s2_queryEmailsSend2AWS()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?). The data found is stored in JSON format and sent to an API. 

See (link to "Sample_data" when ready) for examples of emails and the JSON data that would be returned from them


### step 2 (AWS:Lambda, AWS:API Gateway, and AWS:S3)

After the API receives the JSON file, it triggers the first lambda function ([TransactionProcessor.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor.py)) to run. This lambda function categorizes the data set, formats the date variable, sends data to multiple ‘raw’ S3 databases (based on category), and returns 200 code as the API response. 

See (link to "Sample_data" when ready) for examples of JSON data that before ([TransactionProcessor.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor.py)) versus how the data looks in the ‘raw’ databases

### step 3 (Google Apps Script, AWS:API_Gateway, AWS:Lambda, AWS:S3, AWS:Athena)

After receiving confirmation that the json data has been uploaded to the S3 bucket, Gmail Apps Script request (via [function s3_runAthenaQuery()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)) to execute a Lambda function ([TransactionProcessor_step2.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step2.py)) that runs two separate Athena SQL queries. The first query grabs all data from transactions that occurred in the current pay period and the second query grabs all the data from the past week. By design the results of the queries are stored in a ‘clean’ S3 bucket and the query i.d.’s are returned by the API to the Gmail Apps script.

### step 4 (Google Apps Script, AWS:API_Gateway, AWS:Lambda, AWS:S3, AWS:Athena)

The JavaScript pauses to allow the query to finish properly before making another API request (via [function s4_getAthenaResults2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)). This API request triggers a Lambda function ([TransactionProcessor_step3.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step3.py)) to retrieve the information from the query that grabbed all data from transactions that occurred in the current pay period. The ‘purchase amounts’ are extracted and summed. The date that pay check was last deposited has two weeks added to it to find the next pay day. The latest transaction date in the data set is found and the data in that row is extracted; this information used to created the “You’ve spent XXX of your XXX allowance…” statement found in the example email in the Objective section. 


### step 5
The gmailapps JavaScript [function s5_grabBoxPlot()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js) stores the string data in a variable and makes a call to an API that runs [lambda_function.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step4/lambda_function.py)(AKA TransactionProcessor_step4). The lambda function has multiple python libraries stored in it that allows it to make graphs from the data that’s fed to it. Once the graphs are made it becomes a little tricky to return graph data through an API response. The graphs must be converted to byte data before they can be sent in an API response. The JavaScript needs to convert the byte data back into a png file.

Only one graph can be sent per API response, our system includes two graphs. [lambda_function.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step4/lambda_function.py)(AKA TransactionProcessor_step4) contains the code to return both of the graphs shown in the example email. The lambda function utilizes input data and 'if' statements to control which plots are returned to the JavaScript. 

### step 6
Once the data is received by the JavaScript an email is sent to the user (via [function s7_sendEmail()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js)).