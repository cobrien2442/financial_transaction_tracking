import json
import boto3
from datetime import datetime
import csv


def lambda_handler(event, context):
    
    print (event)
    
    body = json.loads(event['body'])
    
    queryExecutionId = body['queryExecutionId']
    
    client = boto3.client('athena')
    
    queryID = queryExecutionId
    results = client.get_query_results(QueryExecutionId = queryID)
    
    jawn = []
    
    for row in results['ResultSet']['Rows']:
        # Extract the values from each row and append them to the 'jawn' list
        jawn.append([cell['VarCharValue'] for cell in row['Data']])
    
    spent = float(jawn[1][0])
    cashLeft = 1000 - spent
    
    response = "you've spent $" + str(spent) +" this check: you have $" + str(cashLeft) + " until next check."
    
    # Return the 'jawn' list as a JSON response
    return {
        'statusCode': 200,  # You may want to adjust the status code
        'body': json.dumps(response)
    }