const command = new PutObjectCommand({
  Bucket: "sorasola",
  Key: "header.jpg",
  Body: ファイルの内容,
  ContentType: "image/jpeg"
});

await s3.send(command);
