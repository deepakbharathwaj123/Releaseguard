provider "aws" {
  region = "us-east-1"
}

# BUG / VULNERABILITY: Publicly accessible cloud storage bucket without encryption
resource "aws_s3_bucket" "app_storage" {
  bucket = "company-sensitive-customer-documents-2026"
  acl    = "public-read" # Critical vulnerability: allows anyone on the internet to list and read objects!

  tags = {
    Environment = "production"
  }
}

# Permissive security group open to 0.0.0.0/0
resource "aws_security_group" "web_sg" {
  name        = "web-api-sg"
  description = "Allow inbound web traffic"

  ingress {
    from_port   = 22 # Open SSH port to the whole internet!
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
