import time
import boto3
import json
import datetime

DATABASE = "cardtrans"
output = "s3://financetracking/"

def lambda_handler(event, context):
    
    print (event)
    
    body = json.loads(event['body'])
      
    query = body['query']

    client = boto3.client('athena')

    response = client.start_query_execution(
        QueryString=query,
        QueryExecutionContext={
            'Database': DATABASE
        },
        ResultConfiguration={
            'OutputLocation': output,
        }
    )


    return {
        'statusCode': 200,
        'body': json.dumps(response)
    }