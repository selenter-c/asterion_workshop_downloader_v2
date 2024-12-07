import { createLogger, format, Logger, transports } from "winston"

export default createLogger({
	format: format.combine(
		format.timestamp(),
		format.colorize(),
		format.printf((info) => {
			const level = info.level
			const module = info.module || "APP"
			const message = info.message
			const timestamp = info.timestamp

			return `${timestamp} [${module.toUpperCase()}] ${level}: ${message}`
		})
	),
	transports: [
        new transports.Console(),
        new transports.File({
            filename: "logs/logger.log"
        }),
		new transports.File({
			filename: "logs/error.log",
			level: "error"
		})
    ]
})

export function process_error(logger : Logger) {
	process.on("uncaughtException", (error : Error) => {
		logger.log("error", error.stack)
		process.exit(1)
	})
}