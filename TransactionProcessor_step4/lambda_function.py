import io
import json
import base64
import boto3
from matplotlib import pyplot as plt
import seaborn as sns
import pandas as pd
from datetime import datetime


def lambda_handler(event, context):

    binary_data = event['body']

    decoded_data = base64.b64decode(binary_data)
    decoded_string = decoded_data.decode('utf-8') 

    decoded_json = json.loads(decoded_string)

    queryExecutionId = decoded_json['queryExecutionId']

    plotNeeded = decoded_json['plotNeeded']

    # Your existing code to fetch data and create the plot...
    client = boto3.client('athena')
    queryID = queryExecutionId
    results = client.get_query_results(QueryExecutionId = queryID)
    
    json_string = json.dumps(results)

    # Parse the JSON string
    data = json.loads(json_string)

    # Extracting cols
    data_rows = data['ResultSet']['Rows']
    card_values = [row['Data'][0]['VarCharValue'] for row in data_rows[1:]]
    purchase_amounts = [float(row['Data'][1]['VarCharValue']) for row in data_rows[1:]]
    merchant_details = [row['Data'][2]['VarCharValue'] for row in data_rows[1:]]
    dates = [row['Data'][3]['VarCharValue'] for row in data_rows[1:]]
    dep_dates = [row['Data'][4]['VarCharValue'] for row in data_rows[1:]]
    times = [row['Data'][5]['VarCharValue'] for row in data_rows[1:]]
    cc_pay_values = [float(row['Data'][6]['VarCharValue']) for row in data_rows[1:]]
    subject_values = [row['Data'][7]['VarCharValue'] for row in data_rows[1:]]
    purchase_range_values = [row['Data'][8]['VarCharValue'] for row in data_rows[1:]]
    days_of_week = [row['Data'][-1]['VarCharValue'] for row in data_rows[1:]]

    time_values = [datetime.strptime(time, '%I:%M %p').hour for time in times]

    # Convert 'dates' to datetime objects
    date_objects = [datetime.strptime(date, '%m/%d/%Y') for date in dates]

    # Convert days_of_week to numerical values
    #numerical_days = [day_map[day] for day in days_of_week]

    data_dict = {
        'Card': card_values,
        'PurchaseAmount': purchase_amounts,
        'Date': date_objects,
        'DepDate': dep_dates,
        'Time': time_values,
        'Subject': subject_values,
        'PurchRange': purchase_range_values,
        'DayOfWeek': days_of_week
    }

    df = pd.DataFrame(data_dict)

    # Count occurrences of each date and create a new column 'DateCount'
    df['DayNumOfTrans'] = df['Date'].map(df['Date'].value_counts())
    df['TimeCount'] = df['Time'].map(df['Time'].value_counts())
    order1 = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
        
    if plotNeeded == 'barNeeded':

        # Sort DataFrame by 'Date' column
        df_sorted = df.sort_values(by='Date')

        plt.figure()
        #plt.bar(sorted_days, sorted_totals, color='skyblue')
        sns.countplot(df_sorted, x="Date")
        plt.xlabel('Date')
        plt.ylabel('Number of Transactions')
        plt.title('Count of Transactions: past 1 week')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()

        # Save the first plot to a BytesIO object
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')

        return {
            'statusCode': 200,
            'isBase64Encoded': True,
            'headers': {"Content-Type": "image/png"},
            'body': encoded_image
        }

    if plotNeeded == 'barNeeded1':

        # Calculate total purchase amounts for each date
        daily_totals = df.groupby('Date')['PurchaseAmount'].sum().sort_index(ascending=True)

        plt.figure()
        sns.barplot(x=daily_totals.index, y=daily_totals.values, color='skyblue')
        plt.xlabel('Date')
        plt.ylabel('Total Purchase Amount')
        plt.title('Total Purchase Amount: past 1 week')
        plt.xticks(rotation=45)
        plt.tight_layout()
        plt.show()

        # Save the first plot to a BytesIO object
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes = buffer.getvalue()
        encoded_image = base64.b64encode(image_bytes).decode('utf-8')

        return {
            'statusCode': 200,
            'isBase64Encoded': True,
            'headers': {"Content-Type": "image/png"},
            'body': encoded_image
        }


    if plotNeeded == 'boxNeeded':

        # Creating Seaborn boxplot
        plt.figure()  # Create a new figure for Seaborn plot
        #sns.boxplot(data=df, y="PurchaseAmount", x="DayOfWeek", hue="Date", order=order1, width=2)
        sns.boxplot(data=df, y="PurchaseAmount", x="DayOfWeek", order=order1, width=.5)
        plt.xticks(rotation=45)
        plt.title('Transaction costs: past 1 week')
        plt.tight_layout()

        # Save the Seaborn plot to a BytesIO object
        buffer = io.BytesIO()
        plt.savefig(buffer, format='png')
        buffer.seek(0)
        image_bytes2 = buffer.getvalue()
        encoded_image2 = base64.b64encode(image_bytes2).decode('utf-8')

        return {
            'statusCode': 200,
            'isBase64Encoded': True,
            'headers': {"Content-Type": "image/png"},
            'body': encoded_image2
        }