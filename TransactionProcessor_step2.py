import time
import boto3
import json
import datetime

COLUMN = "purchase amount"
DATABASE = "cardtrans"
output = "s3://financetracking/"
qfind = "purchase amount"

def lambda_handler(event, context):
    
    #prePara = '11012023'

    para1 = "date_parse('11/01/2023', '%m/%d/%Y')"

    query = "SELECT SUM(purchaseamount) AS spent FROM cardtrans.financetrackingraw WHERE date_parse(date,'%m/%d/%Y') >= date_parse(depdate,'%m/%d/%Y') and date_parse(depdate,'%m/%d/%Y') >= ?"
    
    client = boto3.client('athena')

    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            'Database': DATABASE
        },
    ExecutionParameters=[
        para1
    ],
        ResultConfiguration={
            'OutputLocation': output,
        }
    )


    return {
        'statusCode': 200,
        #'prePara': para1,
        'body': json.dumps(response)
    }