# 👻 Buu SATI Croner (`@buujs/sati-croner`)
A seamless, type-safe cron scheduling integration extension for the Buu SATI ecosystem, powered by `croner`.

Effortlessly manage cron tasks with automatic lifecycle orchestration, graceful shutdown termination hooks, structured runtime execution logging, and fluent control methods.

---

## Features

* ⏰ **Engineered with Croner**: Built on top of the robust `croner` engine to manage execution patterns cleanly.
* 🛡️ **Auto Graceful Unregistration**: Integrates directly into your application lifecycle, ensuring tasks unregister automatically during process shutdowns.
* 📝 **Contextual Logger Monitoring**: Features comprehensive automated logging for operations, warnings on re-registrations, and caught runtime failures.
* 🎛️ **Fluent Task Control**: Supports chaining API syntax with runtime methods to programmatically `trigger()` or `stop()` scheduled instances on demand.

---

## Installation

```sh
pnpm add @buujs/sati-croner croner
```

--

## Usage

```sh
import { createScheduler } from "@buujs/sati-croner";

// 1. Initialize the scheduler factory with core dependencies
const scheduler = createScheduler({ 
  logger, 
  gracefulShutdown 
});

// 2. Register, chain, and orchestrate jobs smoothly
scheduler.register(
  { 
    name: "analytics-rollup", 
    cronTime: "0 */2 * * *" // Every 2 hours
  }, 
  async () => {
    // Perform recurring background execution tasks
    console.log("Compiling cluster metrics...");
  }
);

// 3. Trigger or stop jobs manually when necessary
scheduler.trigger();
```