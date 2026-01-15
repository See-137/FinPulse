# Redis Module Outputs

output "cluster_id" {
  description = "Redis cluster ID"
  value       = aws_elasticache_cluster.main.cluster_id
}

output "endpoint" {
  description = "Redis endpoint"
  value       = aws_elasticache_cluster.main.cache_nodes[0].address
}

output "port" {
  description = "Redis port"
  value       = aws_elasticache_cluster.main.port
}

output "connection_string" {
  description = "Redis connection string"
  value       = "${aws_elasticache_cluster.main.cache_nodes[0].address}:${aws_elasticache_cluster.main.port}"
}
