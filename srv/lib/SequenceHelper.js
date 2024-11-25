module.exports = class SequenceHelper {
	constructor(options) {
		this.db = options.db;                  // Database connection
		this.sequence = options.sequence;      // Sequence name for HANA
		this.table = options.table;            // Table name for other DBs
		this.field = options.field || "ID";    // Field name for ID generation
	}

	async getNextNumber() {
		let nextNumber = 0;

		try {
			switch (this.db.kind) {
				case "hana": // HANA DB
					const hanaResult = await this.db.run(`SELECT "${this.sequence}".NEXTVAL AS NEXTVAL FROM DUMMY`);
					nextNumber = hanaResult[0]?.NEXTVAL || 1; // Fallback to 1 if no result
					break;

				case "sql":
				case "sqlite": // SQLite or other SQL DBs
                const sqlResult = await this.db.run(`SELECT * FROM "db"."InvoiceItems";`);
				// const sqlResult = await this.db.run(`SELECT MAX("${this.field}") AS MAXVAL FROM "${this.table}"`);
				nextNumber = (parseInt(sqlResult[0]?.MAXVAL) || 0) + 1; 
                console.log(sqlResult);

					break;

				default: // Unsupported DB
					throw new Error(`Unsupported DB kind: ${this.db.kind}`);
			}
			return nextNumber;
		} catch (error) {
			throw new Error(`Error generating next sequence number: ${error.message}`);
		}
	}
};
