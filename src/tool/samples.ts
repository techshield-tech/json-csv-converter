// Sample documents for each tab.

export const SAMPLE_JSON = `[
  {
    "id": 1,
    "name": "Ada Lovelace",
    "email": "ada@example.com",
    "active": true,
    "address": { "city": "London", "zip": "NW1 6XE" },
    "tags": ["math", "computing"]
  },
  {
    "id": 2,
    "name": "Grace Hopper",
    "email": "grace@example.com",
    "active": false,
    "address": { "city": "New York", "zip": "10001" },
    "tags": ["navy", "cobol"],
    "note": "Said \\"It's easier to ask forgiveness\\", reportedly"
  },
  {
    "id": 3,
    "name": "Alan Turing",
    "email": null,
    "active": true,
    "address": { "city": "Wilmslow", "zip": "SK9" },
    "tags": []
  }
]
`;

export const SAMPLE_CSV = `id,name,email,active,score,address.city,address.zip,joined
1,Ada Lovelace,ada@example.com,true,98.5,London,NW1 6XE,1843-07-01
2,Grace Hopper,grace@example.com,false,87,New York,10001,1934-06-15
3,"Turing, Alan",,true,100,Wilmslow,SK9,1936-11-12
4,"Hedy ""Lamarr""",hedy@example.com,null,,Vienna,01010,1942-08-11
`;
