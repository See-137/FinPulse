# Redis Module Outputs

output "replication_group_id" {
  description = "Redis replication group ID"
  value       = aws_elasticache_replication_group.main.replication_group_id
}

# Backward compatibility alias
output "cluster_id" {
  description = "Redis cluster ID (alias for replication_group_id)"
  value       = aws_elasticache_replication_group.main.replication_group_id
}

output "endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.main.primary_endpoint_address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_replication_group.main.port
}

output "connection_string" {
  description = "Redis connection string"
  value       = "${aws_elasticache_replication_group.main.primary_endpoint_address}:${aws_elasticache_replication_group.main.port}"
}

output "reader_endpoint" {
  description = "Redis reader endpoint (for read replicas)"
  value       = aws_elasticache_replication_group.main.reader_endpoint_address
}

output "encryption_enabled" {
  description = "Whether encryption is enabled"
  value = {
    transit = aws_elasticache_replication_group.main.transit_encryption_enabled
    at_rest = aws_elasticache_replication_group.main.at_rest_encryption_enabled
  }
}
