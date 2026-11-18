/**
 * Lightweight Inversion of Control (IoC) Service Container.
 *
 * Implements Dependency Injection (DI) to decouple business domain logic,
 * infrastructure adapters, and UI presenters, facilitating isolation during
 * automated testing and adhering to the Dependency Inversion Principle (DIP).
 */

export type ServiceFactory<T = unknown> = (container: Container) => T;

export class Container {
  private readonly singletons = new Map<string, unknown>();
  private readonly factories = new Map<string, ServiceFactory>();

  registerSingleton<T>(key: string, instance: T): this {
    this.singletons.set(key, instance);
    return this;
  }

  registerFactory<T>(key: string, factory: ServiceFactory<T>): this {
    this.factories.set(key, factory as ServiceFactory);
    return this;
  }

  resolve<T>(key: string): T {
    if (this.singletons.has(key)) {
      return this.singletons.get(key) as T;
    }

    const factory = this.factories.get(key);
    if (factory) {
      const instance = factory(this) as T;
      return instance;
    }

    throw new Error(`[Container] No provider registered for "${key}"`);
  }

  has(key: string): boolean {
    return this.singletons.has(key) || this.factories.has(key);
  }

  clear(): void {
    this.singletons.clear();
    this.factories.clear();
  }
}

export const appContainer = new Container();
