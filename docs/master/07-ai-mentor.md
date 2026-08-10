---

## Part 8 — AI Mentor

An LLM assistant on a platform whose entire value is being **correct** is a
liability unless it is grounded, bounded and honest. These constraints are not
optional polish; they are what make the feature shippable.

### 8.1 What it is

**"Ask the Handbook"** — a retrieval-grounded assistant that answers from
EgyKode's own content and says so, with citations, in Arabic or English.

It is **not** a general chatbot, not a code generator, and not a replacement
for the content. Its job is navigation and explanation of material that already
exists.

### 8.2 Grounding contract (non-negotiable)

1. **Retrieval-augmented only.** Every answer is generated from retrieved
   chunks of EgyKode content (chapters, labs, ADRs, troubleshooting entries,
   the reference repo's code).
2. **Every claim carries a citation** rendered as a link to the source chapter
   and section. An answer with no retrievable source is not returned.
3. **Refusal is a valid answer.** If retrieval confidence is below threshold,
   the assistant says "I don't have this in the handbook yet" and offers a
   search, a related chapter, and a "request this content" action that files a
   GitHub issue. This turns a failure into a content roadmap signal.
4. **Never invents commands, flags, versions, or costs.** A generated `kubectl`
   flag that does not exist is worse than no answer.
5. **Answers in the user's locale**, using the Arabic terminology rules of §2.3
   and the glossary as a constrained vocabulary.
6. Output is rendered through the same MDX sanitiser as user content.

### 8.3 Modes

| Mode | Entry point | Behaviour |
|---|---|---|
| **Ask** | ⌘K → `?`, or the floating button | Q&A over the corpus, cited |
| **Explain this** | Select text in a chapter → "explain" | Re-explains the selection at a simpler level |
| **Explain this error** | Paste terminal output | Routes to troubleshooting entries; explains the error; never guesses a fix without a source |
| **Quiz me** | Chapter footer | Generates questions **from the chapter text only**, validated against it |
| **Translate check** | Translation review UI | Suggests Arabic phrasing, human approves — never auto-publishes |

Deliberately **absent**: "write my Terraform", "debug my cluster", free-form
code generation. Those invite exactly the errors that would destroy trust.

### 8.4 Retrieval implementation

- Chunk at **section** granularity (~500–1000 tokens) with heading breadcrumbs
  preserved, so citations point at a section anchor, not a page.
- **Embeddings stored in PostgreSQL via `pgvector`.** No external vector
  database — one fewer service, one fewer bill, and the corpus is small enough
  (a few thousand chunks) that Postgres is comfortably the right tool.
- **Hybrid retrieval:** vector similarity + PostgreSQL full-text, reciprocal
  rank fusion. Pure vector search fails on exact identifiers like
  `CrashLoopBackOff` and `--dry-run=server`; keyword search catches them.
- Arabic queries are normalised per §4.6 before both retrieval paths.
- Embeddings are regenerated **only for changed chunks**, in CI, on content
  merge — content hashing prevents re-embedding the whole corpus on every push.

### 8.5 Cost control

The cost model is the reason this feature can exist on a free platform.

| Control | Value |
|---|---|
| Model | A small, cheap model is sufficient for grounded Q&A — **Claude Haiku** class. Do not use a frontier model for retrieval summarisation |
| Anonymous quota | **3 questions/day per IP**, then a sign-in prompt |
| Signed-in quota | **20 questions/day**, resetting at local midnight |
| Contributor quota | 100/day (reputation ≥ 200) |
| **BYOK** | Any user may add their own API key in settings for unlimited use — key encrypted at rest, never logged, usable only from their session |
| Caching | Question → answer cache keyed on normalised question + corpus version. Cache hit rate on a Q&A corpus like this is typically 40–60% |
| Context cap | Max 6 retrieved chunks, max 4k input tokens, max 800 output tokens |
| Kill switch | An environment flag disables the feature instantly if spend exceeds budget, degrading to plain search |

**Hard budget: $0–20/month.** If the free-tier or credit allowance is
exhausted, the assistant degrades to search rather than billing.

### 8.6 Safety and transparency

- Every response is visibly labelled as AI-generated, with the model named.
- Thumbs up/down on every answer, stored with the question and retrieved
  chunks, feeding a review queue — **low-rated answers are content gaps**, and
  that dataset is genuinely valuable for prioritising what to write next.
- Prompt-injection defence: retrieved content is delimited and the system prompt
  states that content is data, not instruction. User-generated content
  (posts, comments) is **never** in the retrieval corpus.
- No training on user data. Conversations are retained 30 days for abuse review
  then deleted, and the user can delete them immediately.
- Rate limits are enforced server-side, in Django, never in the client.
