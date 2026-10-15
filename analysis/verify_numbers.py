import pandas as pd

df = pd.read_csv("data/analytics.csv")
cols = ["sessions", "add_to_carts", "checkouts_started", "orders", "revenue_gbp", "ad_spend_gbp"]

def funnel(g):
    s = g[cols].sum()
    return pd.Series({
        "sessions": s.sessions,
        "carts": s.add_to_carts,
        "checkouts": s.checkouts_started,
        "orders": s.orders,
        "cart_to_checkout_%": round(100 * s.checkouts_started / s.add_to_carts, 1),
        "checkout_to_order_%": round(100 * s.orders / s.checkouts_started, 1),
        "revenue": s.revenue_gbp,
    })

def header(title):
    print(f"\n {title} ")

header("SIX-MONTH TOTALS")
t = df[cols].sum()
print(t.to_string())
print("Average order (£):", round(t.revenue_gbp / t.orders, 1))

header("FUNNEL BY CHANNEL TYPE AND DEVICE (social = Instagram + paid social)")
df["channel_type"] = df.channel.isin(["instagram", "paid_social"]).map({True: "social", False: "non-social"})
print(df.groupby(["channel_type", "device"]).apply(funnel).to_string())

im = df[(df.channel == "instagram") & (df.device == "mobile")]
header("INSTAGRAM ON MOBILE: SIX MONTHS")
print(funnel(im).to_string())
header("INSTAGRAM ON MOBILE: SEPTEMBER")
print(funnel(im[im.month == "2026-09"]).to_string())

header("CART -> CHECKOUT RATE MONTHLY")
print(df.groupby("month").apply(funnel)["cart_to_checkout_%"].to_string())

p = df[df.channel == "paid_social"]
header("PAID SOCIAL")
print(funnel(p).to_string())
print("Ad spend (£):", p.ad_spend_gbp.sum())

e = df[df.channel == "email"]
header("EMAIL: ALL DEVICES")
print(funnel(e).to_string())
header("EMAIL: MOBILE ONLY")
print(funnel(e[e.device == "mobile"]).to_string())

header("CATCH ROWS WITH MORE CHECKOUTS THAN CARTS")
print(df[df.checkouts_started > df.add_to_carts][["month", "channel", "device", "add_to_carts", "checkouts_started", "orders"]].to_string(index=False))