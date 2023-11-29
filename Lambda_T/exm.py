import json
import boto3
import base64
from matplotlib import pyplot as plt

def lambda_ds(event, contect):
    
    client = boto3.client('athena')
    queryExecutionId = "b27c6acb-b659-40df-abac-781ef585bceb"

    queryID = queryExecutionId
    r = client.get_query_results(QueryExecutionId = queryID)
    json_string = json.dumps(r)

    # Parse the JSON string
    data = json.loads(json_string)

    # Extracting purchase amounts and days of the week
    data_rows = data['ResultSet']['Rows']
    purchase_amounts = [float(row['Data'][1]['VarCharValue']) for row in data_rows[1:]]
    days_of_week = [row['Data'][-1]['VarCharValue'] for row in data_rows[1:]]

    # Calculating total purchase amounts for each day
    daily_totals = {}
    for day, amount in zip(days_of_week, purchase_amounts):
        if day in daily_totals:
            daily_totals[day] += amount
        else:
            daily_totals[day] = amount

    # Creating the bar chart
    days = list(daily_totals.keys())
    totals = list(daily_totals.values())

    plt.figure(figsize=(10, 6))
    plt.bar(days, totals, color='skyblue')
    plt.xlabel('Day of the Week')
    plt.ylabel('Total Purchase Amount')
    plt.title('Total Purchase Amount per Day of the Week')
    plt.xticks(rotation=45)
    plt.tight_layout()

   image = plt.show()

    return {
        'statusCode': 200,
        'body': base64.b64encode(image).decode('utf-8'),
        'isBase64Encoded': True
    }