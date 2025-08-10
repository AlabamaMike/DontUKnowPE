Examples you can send from the client after connecting:

- Hello/join
{
  "type": "hello",
  "room": "<CODE>",
  "name": "Alex",
  "avatar": "🐱"
}

- Answer
{
  "type": "answer",
  "room": "<CODE>",
  "qid": "tf1",
  "answer": true,
  "ms": 1234
}
