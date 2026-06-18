# 3. Architecture & Coding Guidelines

To keep the codebase uniform and readable, we enforce strict architectural rules for both backend and frontend.

---

## 1. Backend Architecture (NestJS + Clean Architecture / DDD)

We follow Clean Architecture / Domain-Driven Design (DDD). The dependencies point inward: **Interfaces -> Application -> Domain <- Infrastructure**.

```
┌─────────────────────────────────────────────────────────┐
│                     Interfaces                          │
│     (Controllers, Gateways, DTOs, HTTP request handlers)│
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                     Application                         │
│           (Use Cases, Services, Event Handlers)         │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                       Domain                            │
│           (Entities, Interfaces, Symbols)               │
└────────────────────────────▲────────────────────────────┘
                             │
                             │
┌────────────────────────────┴────────────────────────────┐
│                    Infrastructure                       │
│    (Concrete Prisma Repositories, S3, Email Services)   │
└─────────────────────────────────────────────────────────┘
```

### 1.1 Layer Responsibilities

1.  **Domain (`src/domains`)**:
    *   Contains business models and repository **interfaces**.
    *   **Rule**: **ZERO** imports from the application, infrastructure, or interface layers. Keep this layer pure.
    *   Always use a `Symbol` for dependency injection tokens:
        ```typescript
        export const PM_LANDLORD_REPOSITORY = Symbol('PM_LANDLORD_REPOSITORY')
        ```
2.  **Application (`src/application`)**:
    *   Contains the application logic orchestrations called Use Cases.
    *   **Rule**: Each Use Case must be written as a single class with an `execute()` method:
        ```typescript
        @Injectable()
        export class CreatePropertyUseCase {
          constructor(
            @Inject(PM_PROPERTY_REPOSITORY)
            private readonly propertyRepo: IPMPropertyRepository,
          ) {}

          async execute(dto: CreatePropertyDto): Promise<Property> {
            // Business Logic
            return this.propertyRepo.save(dto);
          }
        }
        ```
    *   DTOs inside the application layer use `class-validator`. Always use the definite assignment assertion:
        ```typescript
        export class CreatePropertyDto {
          name!: string;
          address!: string;
        }
        ```
    *   Register all new Use Cases in `ApplicationModule.ts`.
3.  **Interfaces (`src/interfaces/http`)**:
    *   Contains NestJS controllers.
    *   **Rule**: Controllers **MUST NOT** contain business logic. They serve only to validate incoming requests, check authentication, and execute the corresponding Use Cases.
4.  **Infrastructure (`src/shared/infrastructure`)**:
    *   Contains concrete database repositories implementing domain repository interfaces (e.g., Prisma repositories) and third-party API configurations.

---

## 2. Frontend Architecture (Next.js / Vite)

### 2.1 Data Fetching & Mutations
*   **Tanstack Query**: Integrate `useQuery` for fetching and `useMutation` for POST, PATCH, and DELETE operations.
*   **Cache Invalidation**: Always configure your mutations to invalidate the matching query cache via `useQueryClient` upon success:
    ```typescript
    const queryClient = useQueryClient()
    const mutation = useMutation({
      mutationFn: createProperty,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['properties'] })
      }
    })
    ```

### 2.2 Forms and Inputs
*   **Hook Forms**: All form validation should use `react-hook-form` along with the `zod` schema resolver.
*   **UI Updates**: Implement `useWatch` or react-hook-form state checks for dynamic field toggles rather than manually binding component local state triggers where possible.

### 2.3 Styling (Vanilla CSS & BEM Convention)
*   **No Utility Frameworks**: Avoid using Tailwind CSS unless explicitly requested by the user. Rely instead on modular, clean CSS files.
*   **Variables**: All branding colors, sizes, borders, typography weights, and transitions must use variables defined in `src/styles/variables.css`:
    ```css
    .my-button {
      background: var(--clay);
      border-radius: var(--radius-md);
      padding: var(--space-3);
    }
    ```
*   **BEM Class Naming**: Elements must be written using Block Element Modifier class syntax:
    ```html
    <!-- Block -->
    <div class="onboarding-form">
      <!-- Element -->
      <input class="onboarding-form__input" />
      <!-- Element + Modifier -->
      <input class="onboarding-form__input onboarding-form__input--error" />
    </div>
    ```

### 2.4 Icons & Assets
*   **Lucide**: Always use `lucide-react` for graphics. Never use emojis.
*   **Logos**: Use the built-in SVG logo components (such as `UpwardLogo`) for site branding.
*   **Feedback animations**: Use skeleton loading classes (like `animate-pulse`) for components transitioning during load states.
