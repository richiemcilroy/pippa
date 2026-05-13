ALTER TABLE food_items
  ADD FULLTEXT INDEX food_items_search_fulltext_idx (name, brand_name, search_text);
