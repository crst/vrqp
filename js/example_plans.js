var example_plans = [
    {'name': 'Network merge example', 'plan': `
 XN Merge  (cost=1000000000135.70..1000000000136.20 rows=200 width=44)
   Merge Key: t
   ->  XN Network  (cost=1000000000135.70..1000000000136.20 rows=200 width=44)
         Send to leader
         ->  XN Sort  (cost=1000000000135.70..1000000000136.20 rows=200 width=44)
               Sort Key: t
               ->  XN HashAggregate  (cost=127.06..128.06 rows=200 width=44)
                     ->  XN Subquery Scan volt_dt_0  (cost=104.33..120.24 rows=909 width=44)
                           ->  XN HashAggregate  (cost=104.33..111.15 rows=909 width=19)
                                 ->  XN Seq Scan on sales  (cost=0.00..69.55 rows=4637 width=19)`
    },
    {'name': 'Merge join merge example', 'plan': `
 XN Merge  (cost=1000000000178.12..1000000000178.97 rows=340 width=15)
   Merge Key: date_trunc('month'::text, (customers.first_sale_date)::timestamp without time zone)
   ->  XN Network  (cost=1000000000178.12..1000000000178.97 rows=340 width=15)
         Send to leader
         ->  XN Sort  (cost=1000000000178.12..1000000000178.97 rows=340 width=15)
               Sort Key: date_trunc('month'::text, (customers.first_sale_date)::timestamp without time zone)
               ->  XN HashAggregate  (cost=161.28..163.83 rows=340 width=15)
                     ->  XN Merge Join DS_DIST_NONE  (cost=0.00..138.27 rows=4602 width=15)
                           Merge Cond: ("outer".customer_id = "inner".customer_id)
                           ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)
                           ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)`
    },
    {'name': 'Simple merge join example', 'plan': `
 XN HashAggregate  (cost=161.28..163.83 rows=340 width=15)
   ->  XN Merge Join DS_DIST_NONE  (cost=0.00..138.27 rows=4602 width=15)
         Merge Cond: ("outer".customer_id = "inner".customer_id)
         ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)
         ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)`
    },
    {'name': 'Simple hash join example', 'plan': `
XN HashAggregate  (cost=186.39..188.89 rows=1000 width=4)
  ->  XN Hash Join DS_DIST_ALL_NONE  (cost=12.50..163.20 rows=4637 width=4)
        Hash Cond: ("outer".product_id = "inner".product_id)
        ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=4)
        ->  XN Hash  (cost=10.00..10.00 rows=1000 width=4)
              ->  XN Seq Scan on products  (cost=0.00..10.00 rows=1000 width=4)`
    },
    {'name': 'Subquery example', 'plan': `
 XN Merge  (cost=1000000000367.90..1000000000369.05 rows=461 width=12)
   Merge Key: product_id, first_sale_date
   ->  XN Network  (cost=1000000000367.90..1000000000369.05 rows=461 width=12)
         Send to leader
         ->  XN Sort  (cost=1000000000367.90..1000000000369.05 rows=461 width=12)
               Sort Key: product_id, first_sale_date
               ->  XN HashAggregate  (cost=346.35..347.50 rows=461 width=12)
                     ->  XN Subquery Scan volt_dt_0  (cost=265.82..311.84 rows=4602 width=12)
                           ->  XN HashAggregate  (cost=265.82..265.82 rows=4602 width=12)
                                 ->  XN Hash Join DS_DIST_ALL_NONE  (cost=12.50..231.30 rows=4602 width=12)
                                       Hash Cond: ("outer".product_id = "inner".product_id)
                                       ->  XN Merge Join DS_DIST_NONE  (cost=0.00..115.26 rows=4602 width=12)
                                             Merge Cond: ("outer".customer_id = "inner".customer_id)
                                             ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=8)
                                             ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)
                                       ->  XN Hash  (cost=10.00..10.00 rows=1000 width=4)
                                             ->  XN Seq Scan on products  (cost=0.00..10.00 rows=1000 width=4)`
    },
    {'name': 'Two joins example', 'plan': `
 XN HashAggregate  (cost=265.82..277.32 rows=4602 width=19)
   ->  XN Hash Join DS_DIST_ALL_NONE  (cost=12.50..231.30 rows=4602 width=19)
         Hash Cond: ("outer".product_id = "inner".product_id)
         ->  XN Merge Join DS_DIST_NONE  (cost=0.00..115.26 rows=4602 width=19)
               Merge Cond: ("outer".customer_id = "inner".customer_id)
               ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=19)
               ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)
         ->  XN Hash  (cost=10.00..10.00 rows=1000 width=4)
               ->  XN Seq Scan on products  (cost=0.00..10.00 rows=1000 width=4)`
    },
    {'name': 'Two joins with filter example', 'plan': `
 XN HashAggregate  (cost=277.40..288.70 rows=4522 width=19)
   ->  XN Hash Join DS_DIST_ALL_NONE  (cost=14.86..243.48 rows=4522 width=19)
         Hash Cond: ("outer".product_id = "inner".product_id)
         ->  XN Merge Join DS_DIST_NONE  (cost=0.00..126.36 rows=4563 width=19)
               Merge Cond: ("outer".customer_id = "inner".customer_id)
               ->  XN Seq Scan on sales  (cost=0.00..57.96 rows=4598 width=19)
                     Filter: (product_id > 10)
               ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)
         ->  XN Hash  (cost=12.39..12.39 rows=991 width=4)
               ->  XN Seq Scan on products  (cost=0.00..12.39 rows=991 width=4)
                     Filter: (product_id > 10)`
    },
    {'name': 'Sort limit example', 'plan': `
 XN Limit  (cost=1000000000116.50..1000000000116.52 rows=10 width=15)
   ->  XN Merge  (cost=1000000000116.50..1000000000118.77 rows=909 width=15)
         Merge Key: sum(price_paid)
         ->  XN Network  (cost=1000000000116.50..1000000000118.77 rows=909 width=15)
               Send to leader
               ->  XN Sort  (cost=1000000000116.50..1000000000118.77 rows=909 width=15)
                     Sort Key: sum(price_paid)
                     ->  XN GroupAggregate  (cost=0.00..71.83 rows=909 width=15)
                           ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)`
    },
    {'name': 'Window example', 'plan': `
 XN Window  (cost=1000000000125.59..1000000000136.95 rows=909 width=36)
   Order: sum_price_paid
   ->  XN Sort  (cost=1000000000125.59..1000000000127.86 rows=909 width=36)
         Sort Key: sum_price_paid
         ->  XN Network  (cost=0.00..80.92 rows=909 width=36)
               Send to slice 0
               ->  XN Subquery Scan sales_per_customer  (cost=0.00..80.92 rows=909 width=36)
                     ->  XN GroupAggregate  (cost=0.00..71.83 rows=909 width=15)
                           ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)`
    },
    {'name': 'Window with partition example', 'plan': `
XN Window  (cost=1000000000147.76..1000000000161.29 rows=902 width=40)
   Partition: customers.first_sale_date
   Order: sales_per_customer.sum_price_paid
   ->  XN Sort  (cost=1000000000147.76..1000000000150.01 rows=902 width=40)
         Sort Key: customers.first_sale_date, sales_per_customer.sum_price_paid
         ->  XN Network  (cost=0.00..103.48 rows=902 width=40)
               Distribute
               ->  XN Merge Join DS_DIST_NONE  (cost=0.00..103.48 rows=902 width=40)
                     Merge Cond: ("outer".customer_id = "inner".customer_id)
                     ->  XN Subquery Scan sales_per_customer  (cost=0.00..80.92 rows=909 width=36)
                           ->  XN GroupAggregate  (cost=0.00..71.83 rows=909 width=15)
                                 ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=15)
                     ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)`
    },
    {'name': 'Simple result example', 'plan': `
 XN Result  (cost=0.00..0.01 rows=1 width=0)`
    },
    {'name': 'Union example', 'plan': `
 XN Unique  (cost=1000000000000.05..1000000000000.06 rows=2 width=0)
   ->  XN Sort  (cost=1000000000000.05..1000000000000.06 rows=2 width=0)
         Sort Key: a
         ->  XN Append  (cost=0.00..0.04 rows=2 width=0)
               ->  XN Network  (cost=0.00..0.02 rows=1 width=0)
                     Distribute Round Robin
                     ->  XN Subquery Scan "*SELECT* 1"  (cost=0.00..0.02 rows=1 width=0)
                           ->  XN Result  (cost=0.00..0.01 rows=1 width=0)
               ->  XN Network  (cost=0.00..0.02 rows=1 width=0)
                     Distribute Round Robin
                     ->  XN Subquery Scan "*SELECT* 2"  (cost=0.00..0.02 rows=1 width=0)
                           ->  XN Result  (cost=0.00..0.01 rows=1 width=0)`
    },
    {'name': 'Simple nested loop example', 'plan': `
 XN Nested Loop DS_BCAST_INNER  (cost=0.00..120031.42 rows=902 width=12)
   ->  XN Seq Scan on customers  (cost=0.00..9.02 rows=902 width=8)
   ->  XN Seq Scan on numbers  (cost=0.00..0.01 rows=1 width=4)
         Filter: ((n <= 12) AND (n >= 1))`
    },
    {'name': 'Except example', 'plan': `
 XN SetOp Except  (cost=1000000000129.55..1000000000134.50 rows=99 width=4)
   ->  XN Sort  (cost=1000000000129.55..1000000000132.03 rows=989 width=4)
         Sort Key: product_id
         ->  XN Append  (cost=0.00..80.35 rows=989 width=4)
               ->  XN Subquery Scan "*SELECT* 1"  (cost=0.00..67.83 rows=987 width=4)
                     ->  XN Unique  (cost=0.00..57.96 rows=987 width=4)
                           ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=4)
               ->  XN Subquery Scan "*SELECT* 2"  (cost=0.00..12.52 rows=2 width=4)
                     ->  XN Seq Scan on products  (cost=0.00..12.50 rows=2 width=4)
                           Filter: ((product_name)::text = 'Product 42'::text)`
    },
    {'name': 'Intersect example', 'plan': `
 XN Hash Intersect Distinct DS_DIST_NONE  (cost=0.00..0.00 rows=1 width=4)
   Hash Cond: ("outer".customer_id = "inner".customer_id)
   Join Filter: (("outer".customer_id = "inner".customer_id) OR (("inner".customer_id IS NULL) AND ("outer".customer_id IS NULL)))
   ->  XN Network  (cost=0.00..67.05 rows=909 width=4)
         Distribute
         ->  XN Subquery Scan "*SELECT* 1"  (cost=0.00..67.05 rows=909 width=4)
               ->  XN Unique  (cost=0.00..57.96 rows=909 width=4)
                     ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=4)
   ->  XN Hash  (cost=0.02..0.02 rows=1 width=4)
         ->  XN Subquery Scan "*SELECT* 2"  (cost=0.00..0.02 rows=1 width=4)
               ->  XN Seq Scan on customers  (cost=0.00..0.01 rows=1 width=4)
                     Filter: ((customer_id <= 10) AND (customer_id >= 1))`
    },
    {'name': 'Not in join example', 'plan': `
 XN Hash NOT IN Join DS_DIST_NONE  (cost=0.14..104.74 rows=4637 width=36)
   Hash Cond: ("outer".customer_id = "inner".customer_id)
   ->  XN Seq Scan on sales  (cost=0.00..46.37 rows=4637 width=36)
   ->  XN Hash  (cost=0.13..0.13 rows=5 width=4)
         ->  XN Subquery Scan "IN_subquery"  (cost=0.00..0.13 rows=5 width=4)
               ->  XN Unique  (cost=0.00..0.08 rows=5 width=4)
                     ->  XN Seq Scan on customers  (cost=0.00..0.07 rows=5 width=4)
                           Filter: ((customer_id % 10) = 0)`
    },
    {'name': 'Merge aggregate example', 'plan': `
XN Merge  (cost=1002815366604.92..1002815366606.36 rows=576 width=27)
  Merge Key: sum(sales.pricepaid)
  ->  XN Network  (cost=1002815366604.92..1002815366606.36 rows=576 width=27)
        Send to leader
        ->  XN Sort  (cost=1002815366604.92..1002815366606.36 rows=576 width=27)
              Sort Key: sum(sales.pricepaid)
              ->  XN HashAggregate  (cost=2815366577.07..2815366578.51 rows=576 width=27)
                    ->  XN Hash Join DS_BCAST_INNER  (cost=109.98..2815365714.80 rows=172456 width=27)
                          Hash Cond: ("outer".eventid = "inner".eventid)
                          ->  XN Seq Scan on sales  (cost=0.00..1724.56 rows=172456 width=14)
                          ->  XN Hash  (cost=87.98..87.98 rows=8798 width=21)`
    }
];
