const entry = JSON.stringify({ level: "error", message: "Unhandled error in pipeline", error: "Simulated failure" });
process.stdout.write(entry + "\n");
process.exit(1);
