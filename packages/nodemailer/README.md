# 👻 Buu SATI Nodemailer  (`@buujs/sati-nodemailer`)
An elegant, type-safe mailer integration for the SATI middleware ecosystem, powered by Nodemailer.

Inject, configure, and manage enterprise-grade SMTP transporters effortlessly within your unified Hono architecture with full runtime safety and zero boilerplate.

---

## Features

* 🔌 **Seamless Hono Context Injection**: Automatically bind custom mailer instances globally or per-route into your Hono runtime context (`c.var.mailer`).
* 🛡️ **Environment-Aware Transport Setup**: Flexible configurations tailored out-of-the-box for both local development and hardened TLS production workloads (automatic STARTTLS vs Explicit SSL handling).
* ⚙️ **Modular Adapter Pattern**: Built to cleanly decouple mailer implementations from core routing logic, leaving room for alternative configurations[cite: 1].

---

## Installation

```sh
pnpm add @buujs/sati-nodemailer nodemailer hono
pnpm add -D @types/nodemailer
```

---

### Usage

```ts
import { Hono } from "hono";
import { mailer } from "@buujs/sati-nodemailer";
import { createSMTPMailer } from "@buujs/sati-nodemailer/smtp";

const app = new Hono();

// Configure the SMTP transport instance
const transport = createSMTPMailer({
  host: "smtp.example.com",
  port: 587,
  user: "user@example.com",
  password: "securepassword",
  from: "noreply@example.com",
  principal: "My App Team",
  isProduction: process.env.NODE_ENV === "production"
});

// Register the mailer middleware globally or to specific sub-routers
app.use("*", mailer(transport));
```