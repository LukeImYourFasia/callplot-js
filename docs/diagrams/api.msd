opt/title/POST /orders on the fictional ShopAPI
opt/messageNumbering/on
opt/columnPitch/18
guy/c/Mobile app
guy/g/API gateway
guy/o/Order service
guy/d/Postgres
guy/k/Redis cache
guy/q/Event bus^Kafka
guy/a/AI model^fraud + upsell
guy/p/Payment API^external
guy/w/Warehouse^external
c->g/POST /orders (JWT)
g->g/verify JWT, rate limit
g->o/createOrder(cart)/order id
o->k/GET cart:42/miss
o->d/SELECT cart, prices, stock/rows
o->a/score order risk/risk 0.07
!!model claude, 1.2 s, 410 tokens
o->d/BEGIN, INSERT order, INSERT items, UPDATE stock/ok
o->p/charge card (idempotency key)/402 declined
!The first charge fails. The service retries once with a backup method.
o->p/charge card, retry/200 paid
o->d/UPDATE order SET status = PAID/ok
o->q/publish order.paid^async
q->w/order.paid/ack
w->q/shipment.created^async
q->o/shipment.created
o->d/UPDATE order SET shipment = ...
o->k/DEL cart:42
o->g/201 Created
g->c/201 + order id
note/q/Other consumers get the event:^email, analytics, loyalty points.
