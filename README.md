# Financial Transaction Tracking

## Summary

With the evolution of 'contactless payment' becoming widely available to the population, the physical action of spending money has become much less taxing to complete. This automation in the spending process has caused a higher volume of transactions compared to times before 'contactless payment' widespread adoption. The reduction of friction in the spending process should be accompanied with automated tracking of transaction interactions and easy to digest spending reports for the consumer. 

This project addresses the automation misalignment seen between the payment process and the process used to track those payments. A higher volume of payments calls for a higher volume of 'tracking reports' to be seen by the consumer to stave off overspending.

## Objective

A report is sent to the consumer every time a transaction occurs that list:

-How much was spent 

-the sum of transactions per current pay period (restarts every two weeks) 

-Difference between sum of spent vs allowed spending limit

## Process 

The tracking/reporting of financial transactions is achieved via serverless architecture (across multiple cloud platforms) that execute time/event driven functions. 

### ETL Flow Path (steps explained below)

![alt text](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/jpg_store/ETL_flow.png?raw=true)

Once Wells Fargo detects an electronic payment has been made an email is sent to a Gmail account.

### step 1
GoogleApps script has a time driven trigger that runs once every 60 seconds (use to [function setFincTrigger()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L5) activate). If an email is detected that appears to have come from the bank stating a transaction has occured the following occurs: GmailApps script parses the email (via [function s2_queryEmailsSend2AWS2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L36)) to find cost of transaction, the date/time of the transaction, where the transaction took place, and runs a separate search to find last paycheck deposit (via [function s1_lastDepDate2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L24)). This information is then stored in variables (in json format) that is sent to an AWS API. (note: If the API successfully receives the information the script deletes the current email). 

### step 2
After the API receives the JSON file, it triggers the first lambda function ([TransactionProcessor.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor.py?plain=1#L1)) to run. This lambda function takes the JSON file, formats it, and then sends the file to a 'raw' AWS S3 bucket.

### step 3
After receiving confirmation that the file has been uploaded to the S3 bucket, GmailApps script request (via [function s3_runAthenaQuery2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L105)) to execute a Lambda function ([TransactionProcessor_step2.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step2.py?plain=1#L1)) that runs an Athena SQL query on the 'raw' S3 bucket. This query will sum the value of money spent in the current pay period and then calculate the difference of allowance left. The results of the query are stored in a separate 'clean' S3 Bucket. The API returns the query ID number to the JavaScript.

### step 4
The JavaScript pauses to allow the query to finish properly before making another API request (via [function s4_getAthenaResults2()](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L138)). This API request triggers a Lambda function ([TransactionProcessor_step3.py](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/TransactionProcessor_step3.py?plain=1#L1)) to retrieve the query results from the 'clean' S3 bucket. The API returns the data to the GmailApps script.

### step 5
Once the data is received by the JavaScript an email is sent to the user (via [GmailApp.sendEmail](https://github.com/cobrien2442/financial_transaction_tracking/blob/main/GmailApps.js?plain=1#L158)).

## Future Steps:
...in progress