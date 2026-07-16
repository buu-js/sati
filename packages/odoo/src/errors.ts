export class OdooError extends Error {
  public code?: number
  public data?: any

  constructor(errorObject: { code?: number; message: string; data?: any }) {
    const message =
      errorObject?.data?.message || errorObject?.message || "Unknown Odoo RPC Error"

    super(message)

    this.name = "OdooError"
    this.code = errorObject?.code

    this.data = errorObject?.data

    Object.setPrototypeOf(this, new.target.prototype)
  }
}
