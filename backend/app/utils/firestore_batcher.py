from google.cloud import firestore
import time

class FirestoreBatcher:
    def __init__(self, client, batch_size=250):
        self.client = client
        self.batch = client.batch()
        self.batch_size = batch_size
        self.count = 0

    def set(self, ref, data):
        self.batch.set(ref, data)
        self.count += 1

        if self.count >= self.batch_size:
            self.commit()

    def commit(self):
        if self.count == 0:
            return

        for attempt in range(3):
            try:
                self.batch.commit()
                break
            except Exception as e:
                print(f"Batch commit failed, retrying… {e}")
                time.sleep(1)

        self.batch = self.client.batch()
        self.count = 0

    def finalize(self):
        self.commit()
