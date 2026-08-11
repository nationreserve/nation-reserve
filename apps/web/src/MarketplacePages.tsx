/* eslint-disable react-refresh/only-export-components */
import { useEffect, useState, type FormEvent } from "react";
import {
  Alert,
  EmptyState,
  ErrorState,
  PageHeader,
} from "@nation-reserve/design-system";
import { api } from "./auth-client.js";

type Manufacturer = {
  id: string;
  displayName: string;
  description?: string;
  websiteUrl?: string;
  countryCode?: string;
  robotCategories?: string[];
  integrationStatus: string;
  modelCount?: number;
  models?: Array<{
    id: string;
    name: string;
    code: string;
    version: string;
    description?: string;
    category?: string;
  }>;
};
type ConversationSummary = {
  id: string;
  subject: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
};
type Conversation = {
  id: string;
  subject: string;
  messages: Array<{
    id: string;
    body: string;
    createdAt: string;
    senderName?: string;
    sentByMe: boolean;
  }>;
  contexts: Array<{ type: string; id: string }>;
};
const organizationId = () =>
  sessionStorage.getItem("nr-active-organization") ??
  sessionStorage.getItem("currentOrganizationId") ??
  "";

function Directory() {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<Manufacturer[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      const query = new URLSearchParams({ limit: "50" });
      if (search.trim()) query.set("search", search.trim());
      void api
        .get<{ items: Manufacturer[] }>(`/api/v1/marketplace/manufacturers?${query}`)
        .then((result) => {
          setItems(result.items);
          setError("");
        })
        .catch((cause) =>
          setError(
            cause instanceof Error ? cause.message : "Unable to load manufacturers.",
          ),
        )
        .finally(() => setLoading(false));
    }, 200);
    return () => clearTimeout(timer);
  }, [search]);
  return (
    <section className="company-page">
      <PageHeader
        eyebrow="Hiring Company"
        title="Robot Manufacturer directory"
        description="Find approved manufacturers, compare supported robot models, and start a private business conversation."
      />
      <label className="manufacturer-search">
        Search manufacturers, models, or capabilities
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by manufacturer or robot model"
        />
      </label>
      {loading && <p role="status">Loading approved manufacturers…</p>}
      {error && <ErrorState description={error} />}{" "}
      {!loading && !error && !items.length && (
        <EmptyState
          title="No approved manufacturers found"
          description="Try a broader search. Only approved, active manufacturers appear here."
        />
      )}
      <div className="company-records">
        {items.map((item) => (
          <article className="nr-card" key={item.id}>
            <p className="nr-eyebrow">{item.countryCode ?? "Approved network"}</p>
            <h2>{item.displayName}</h2>
            <p>
              {item.description ??
                "Approved manufacturer profile. Open the profile for supported models and integration details."}
            </p>
            <dl>
              <dt>Approved models</dt>
              <dd>{item.modelCount ?? 0}</dd>
              <dt>Integration</dt>
              <dd>{item.integrationStatus.replaceAll("_", " ")}</dd>
            </dl>
            <a href={`/company/manufacturers/${item.id}`}>View manufacturer profile</a>
          </article>
        ))}
      </div>
    </section>
  );
}

function ManufacturerProfile({ id }: { id: string }) {
  const [item, setItem] = useState<Manufacturer>();
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  useEffect(() => {
    void api
      .get<Manufacturer>(`/api/v1/marketplace/manufacturers/${id}`)
      .then(setItem)
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load manufacturer.",
        ),
      );
  }, [id]);
  async function contact(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const org = organizationId();
    if (!org) {
      setMessage(
        "Choose your Hiring Company organization before starting a conversation.",
      );
      return;
    }
    const data = new FormData(event.currentTarget);
    try {
      const result = await api.post<{ id: string }>(
        `/api/v1/organizations/${org}/conversations`,
        {
          manufacturerId: id,
          subject: data.get("subject"),
          message: data.get("message"),
          contexts: [],
        },
        { "Idempotency-Key": crypto.randomUUID() },
      );
      location.href = `/company/conversations/${result.id}`;
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Message could not be sent.");
    }
  }
  if (error) return <ErrorState description={error} />;
  if (!item) return <p role="status">Loading manufacturer profile…</p>;
  return (
    <section className="company-page">
      <PageHeader
        eyebrow="Approved Robot Manufacturer"
        title={item.displayName}
        description={
          item.description ?? "Manufacturer capabilities and supported models."
        }
      />
      <div className="company-records">
        {item.models?.map((model) => (
          <article className="nr-card" key={model.id}>
            <p className="nr-eyebrow">{model.category ?? "Robot model"}</p>
            <h2>{model.name}</h2>
            <p>
              {model.description ??
                "Contact the manufacturer for deployment-specific capability, pricing, and lead-time information."}
            </p>
            <dl>
              <dt>Model number</dt>
              <dd>{model.code}</dd>
              <dt>Version</dt>
              <dd>{model.version}</dd>
            </dl>
          </article>
        ))}
      </div>
      <form className="company-form" onSubmit={(event) => void contact(event)}>
        <h2>Message manufacturer</h2>
        <p>
          This creates a private conversation visible only to authorized members of the
          participating organizations.
        </p>
        <label>
          Subject
          <input name="subject" required maxLength={200} />
        </label>
        <label>
          Message
          <textarea name="message" required maxLength={10000} rows={6} />
        </label>
        <button>Send private inquiry</button>
      </form>
      {message && <p role="status">{message}</p>}
    </section>
  );
}

function Conversations({ role }: { role: "company" | "manufacturer" }) {
  const org = organizationId();
  const [items, setItems] = useState<ConversationSummary[]>([]);
  const [error, setError] = useState("");
  const missingOrganization = !org;
  useEffect(() => {
    if (!org) return;
    void api
      .get<{ items: ConversationSummary[] }>(
        `/api/v1/organizations/${org}/conversations`,
      )
      .then((result) => setItems(result.items))
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load conversations.",
        ),
      );
  }, [org]);
  return (
    <section className={`${role}-page`}>
      <PageHeader
        eyebrow={role === "company" ? "Hiring Company" : "Robot Manufacturer"}
        title="Private conversations"
        description="Persistent, organization-protected conversations with unread state and business context."
      />
      {missingOrganization && (
        <ErrorState description="Choose an organization to view conversations." />
      )}
      {error && <ErrorState description={error} />}{" "}
      {!error && !items.length && (
        <EmptyState
          title="No conversations yet"
          description={
            role === "company"
              ? "Open an approved manufacturer profile to start a private inquiry."
              : "Company inquiries and authorized business conversations will appear here."
          }
        />
      )}
      <div className={`${role}-records`}>
        {items.map((item) => (
          <article className="nr-card" key={item.id}>
            <h2>{item.subject}</h2>
            <p>{item.lastMessage ?? "No message preview"}</p>
            <small>
              {item.lastMessageAt
                ? new Date(item.lastMessageAt).toLocaleString()
                : "No messages"}
            </small>
            {item.unreadCount > 0 && <strong>{item.unreadCount} unread</strong>}
            <a href={`/${role}/conversations/${item.id}`}>Open conversation</a>
          </article>
        ))}
      </div>
    </section>
  );
}

function ConversationDetail({
  role,
  id,
}: {
  role: "company" | "manufacturer";
  id: string;
}) {
  const org = organizationId();
  const [conversation, setConversation] = useState<Conversation>();
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const load = async () => {
    try {
      const result = await api.get<Conversation>(
        `/api/v1/organizations/${org}/conversations/${id}`,
      );
      setConversation(result);
      await api.post(`/api/v1/organizations/${org}/conversations/${id}/read`, {});
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load conversation.");
    }
  };
  useEffect(() => {
    if (!org) return;
    void api
      .get<Conversation>(`/api/v1/organizations/${org}/conversations/${id}`)
      .then((result) => {
        setConversation(result);
        return api.post(`/api/v1/organizations/${org}/conversations/${id}/read`, {});
      })
      .catch((cause) =>
        setError(
          cause instanceof Error ? cause.message : "Unable to load conversation.",
        ),
      );
  }, [org, id]);
  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const message = new FormData(form).get("message");
    setSending(true);
    try {
      await api.post(
        `/api/v1/organizations/${org}/conversations/${id}/messages`,
        { message },
        { "Idempotency-Key": crypto.randomUUID() },
      );
      form.reset();
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Message could not be sent. Retry when ready.",
      );
    } finally {
      setSending(false);
    }
  }
  if (error && !conversation) return <ErrorState description={error} />;
  if (!conversation) return <p role="status">Loading conversation…</p>;
  return (
    <section className={`${role}-page`}>
      <PageHeader
        eyebrow="Private conversation"
        title={conversation.subject}
        description="Only authorized participants from the audience organizations can open or send messages."
      />
      {conversation.contexts.length > 0 && (
        <Alert title="Related business records">
          {conversation.contexts
            .map((item) => `${item.type.replaceAll("_", " ")} ${item.id}`)
            .join(" · ")}
        </Alert>
      )}
      <ol className="conversation-thread">
        {conversation.messages.map((item) => (
          <li className={item.sentByMe ? "is-mine" : ""} key={item.id}>
            <strong>
              {item.sentByMe ? "You" : (item.senderName ?? "Participant")}
            </strong>
            <p>{item.body}</p>
            <time dateTime={item.createdAt}>
              {new Date(item.createdAt).toLocaleString()}
            </time>
          </li>
        ))}
      </ol>
      <form className="company-form" onSubmit={(event) => void send(event)}>
        <label>
          Reply
          <textarea name="message" required maxLength={10000} rows={4} />
        </label>
        <button disabled={sending}>{sending ? "Sending…" : "Send reply"}</button>
      </form>
      {error && <p role="alert">{error}</p>}
    </section>
  );
}

export function isMarketplaceRoute(path: string) {
  return (
    path === "/company/manufacturers" ||
    /^\/company\/manufacturers\/[^/]+$/.test(path) ||
    path === "/company/conversations" ||
    /^\/company\/conversations\/[^/]+$/.test(path) ||
    path === "/manufacturer/conversations" ||
    /^\/manufacturer\/conversations\/[^/]+$/.test(path)
  );
}
export function MarketplacePage({ path }: { path: string }) {
  const profile = path.match(/^\/company\/manufacturers\/([^/]+)$/);
  if (profile) return <ManufacturerProfile id={profile[1]!} />;
  const detail = path.match(/^\/(company|manufacturer)\/conversations\/([^/]+)$/);
  if (detail)
    return (
      <ConversationDetail
        role={detail[1] as "company" | "manufacturer"}
        id={detail[2]!}
      />
    );
  if (path === "/company/manufacturers") return <Directory />;
  return (
    <Conversations role={path.startsWith("/company") ? "company" : "manufacturer"} />
  );
}
